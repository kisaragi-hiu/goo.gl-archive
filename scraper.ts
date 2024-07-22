import type { Database as BunDatabase } from "bun:sqlite";
// Pretend that the better-sqlite3 database constructor object is like Bun's
// Database object. We can take care to check that it works on Node ourselves.
//
// The alternative is basically to use
// https://github.com/farjs/better-sqlite3-wrapper/ or write an equivalent to
// it.
const Database = (process.isBun
  ? (await import("bun:sqlite")).Database
  : (await import("better-sqlite3")).default) as unknown as typeof BunDatabase;

import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import shuffle from "lodash/shuffle";

import type { Slug } from "./slugs.ts";
import { slugs } from "./slugs.ts";

const db = new Database("data.sqlite");
db.exec(`
PRAGMA busy_timeout=1000;
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS mapping (slug TEXT UNIQUE, value TEXT);
CREATE TABLE IF NOT EXISTS errors (slug TEXT UNIQUE, status INTEGER, message TEXT);
`);

/**
 * Split `arr` into a fixed number of sublists.
 * (Naming is hard...)
 */
function chunkN<Elem>(arr: Elem[], sublists: number) {
  const buckets: Elem[][] = [];
  for (let i = 0; i < sublists; i++) {
    buckets.push(new Array());
  }
  let j = 0;
  for (const elem of arr) {
    buckets[j].push(elem);
    j = (j + 1) % sublists;
  }
  return buckets;
}

/* Writing */

const slugStoredStmt = db.prepare("SELECT slug FROM mapping WHERE slug = ?");
const slugErrorStatusStmt = db.prepare(
  "SELECT status FROM errors WHERE slug = ?",
);
function slugStored(slug: Slug) {
  return (
    slugStoredExternally(slug) ||
    !!slugStoredStmt.get(slug) ||
    [400, 500].includes(
      (slugErrorStatusStmt.get(slug) as { status: number })?.status,
    )
  );
}

const slugInsertStmt = db.prepare(`
INSERT INTO mapping (slug, value) VALUES (?, ?)
`);
/**
 * Insert an entry for `slug` and `value`.
 */
function slugInsert(slug: Slug, value: string | null) {
  try {
    return slugInsertStmt.run(slug, value);
  } catch (e) {
    // This means something else has inserted the slug between the check and now.
    // Just keep going.
    if ((e as any)?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      console.log(`${slug} is already present`);
      return 0;
    }
    throw e;
  }
}

const errorInsertStmt = db.prepare(`
INSERT INTO errors (slug, status, message) VALUES (?, ?, ?)
  ON CONFLICT(slug)
  DO UPDATE SET
    status=excluded.status,
    message=excluded.message;
`);
function errorInsert(slug: Slug, status: number, message: string) {
  return errorInsertStmt.run(slug, status, message);
}

/* Reading DB */

/** Return slugs that have been stored. */
function getCurrentSlugs(): string[] {
  return db
    .prepare("select slug from mapping")
    .all()
    .map((obj) => (obj as { slug: Slug }).slug);
}

/** Return slugs of goo.gl links mentioned in values. */
function getMentions(): string[] {
  return db
    .prepare(
      "select distinct value from mapping where value LIKE '%//goo.gl/%'",
    )
    .all()
    .map((obj) => (obj as { value: string }).value)
    .map((s) => {
      const m = s.match(/https?:\/\/goo\.gl\/((?:fb\/)?[a-zA-Z0-9]+)/);
      if (m !== null) return m[1];
    })
    .filter((s) => typeof s !== "undefined")
    .filter((slug) => !slugStored(slug));
}

async function readExternalSlugs(): Promise<Slug[]> {
  try {
    return JSON.parse(
      readFileSync("external-slugs.json", { encoding: "utf-8" }),
    ) as Slug[];
  } catch (_e) {
    return [];
  }
}

const externalSlugs = new Set(await readExternalSlugs());

function slugStoredExternally(slug: Slug) {
  return externalSlugs.has(slug);
}

/**
 * Do the actual scraping.
 * Start from the slug given as `init`.
 *
 * If `init` is actually an array of slugs, iterate through it instead of the
 * infinite sequence starting from `init`.
 *
 * Already successfully stored values (including 404, which is a valid value for
 * "this resolves to nothing") are skipped, while errors are stored into a
 * separate table.
 *
 * If `prefix` is provided, make the slug "${prefix}/${slug}" instead. Some prefixes:
 * - /fb/ for feedburner.com URLs
 * - /maps/ for Google Maps - are these impacted?
 *
 * If `until` is provided, stop at that point instead of continuing indefinitely.
 */
async function scrape(
  init?: Slug | Slug[],
  prefix?: string,
  until?: Slug,
): Promise<void> {
  for (const it of Array.isArray(init) ? init : slugs(init, until)) {
    const slug = prefix ? `${prefix}/${it}` : it;
    if (slugStored(slug)) {
      // console.log(`"${slug}" already stored`);
      continue;
    }
    const result = await fetch(`https://goo.gl/${slug}`, {
      method: "head",
      redirect: "manual",
    });
    if (result.status === 301 || result.status === 302) {
      const location = result.headers.get("location");
      if (typeof location === "string") {
        // state: resolved to a URL
        console.log(`${slug} -> ${location}`);
        slugInsert(slug, location);
      } else {
        // state: 301/302 but no location
      }
    } else if (result.status === 404) {
      // state: resolved to no mapping
      console.log(`${slug} -> NULL`);
      slugInsert(slug, null);
    } else if (result.status === 400) {
      // state: generic error? Disallowed (blocked) links use this, some
      // "invalid dynamic link" errors also use this.
      console.log(`${slug} -> 400`);
      errorInsert(slug, result.status, result.statusText);
    } else if (result.status === 302) {
      // state: this is an internal page. Store the status, at least.
      console.log(`${slug} -> ${result.status}`);
      errorInsert(slug, result.status, result.statusText);
    } else {
      // state: what the fuck?
      console.log(`${slug} -> error (${result.status})`);
      errorInsert(slug, result.status, result.statusText);
    }
  }
}

function parseThreadsArg(raw: string | undefined) {
  if (typeof raw === "undefined") return 8;
  const int = parseInt(raw);
  if (Number.isNaN(int) || int <= 0) {
    console.log("Invalid threads argument, using 8");
    return 8;
  }
  return int;
}

const parsedArgs = parseArgs({
  args: process.argv.slice(2),
  options: {
    init: { type: "string" },
    threads: { type: "string" },
    slugArrayFile: { type: "string" },
    prefix: { type: "string" },
    until: { type: "string" },
    export: { type: "boolean" },
    exportMentions: { type: "boolean" },
  },
});

const threads = parseThreadsArg(parsedArgs.values.threads);

if (parsedArgs.values.export) {
  writeFileSync("external-slugs.json", JSON.stringify(getCurrentSlugs()));
  console.log("Current slugs have been written to external-slugs.json");
} else if (parsedArgs.values.exportMentions) {
  writeFileSync("mentioned-slugs.json", JSON.stringify(getMentions()));
  console.log(
    "Slugs mentioned in the current values have been written to mentioned-slugs.json",
  );
} else if (typeof parsedArgs.values.slugArrayFile === "string") {
  const allSlugs = shuffle(
    JSON.parse(
      readFileSync(parsedArgs.values.slugArrayFile, { encoding: "utf-8" }),
    ),
  ) as Slug[];
  await Promise.all(
    chunkN(allSlugs, threads).map((arr) =>
      scrape(arr, parsedArgs.values.prefix),
    ),
  );
} else {
  await scrape(
    parsedArgs.values.init,
    parsedArgs.values.prefix,
    parsedArgs.values.until,
  );
}
