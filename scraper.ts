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

import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import shuffle from "lodash/shuffle";
import truncate from "lodash/truncate";

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

function writeMentions(options: { showCount?: boolean } = {}) {
  const mentions = getMentions();
  writeFileSync("mentioned-slugs.json", JSON.stringify(mentions));
  console.log(
    "Slugs mentioned in the current values have been written to mentioned-slugs.json",
  );
  if (options.showCount)
    console.log(`There are ${mentions.length} mentioned slugs`);
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
  /** Scrape just one slug, then return. */
  justOne?: boolean,
): Promise<void> {
  for (const it of Array.isArray(init) ? init : slugs(init, until)) {
    const slug = prefix ? `${prefix}/${it}` : it;
    if (slugStored(slug)) {
      // console.log(`"${slug}" already stored`);
      continue;
    }
    // From 2024-08-23, some requests will start being served an "interstitial page".
    // The "si=1" query param is offered to suppress this behavior.
    //
    // The deadline for the whole ordeal is 2025-08-25.
    const result = await fetch(`https://goo.gl/${slug}?si=1`, {
      method: "head",
      redirect: "manual",
    });
    const status = result.status;
    if (status === 301 || status === 302) {
      const location = result.headers.get("location");
      if (typeof location === "string") {
        // state: resolved to a URL
        slugInsert(slug, location);
        console.log(`${slug} -> ${truncate(location, { length: 100 })}`);
      } else {
        // state: 301/302 but no location
      }
    } else if (status === 404) {
      // state: resolved to no mapping
      slugInsert(slug, null);
      console.log(`${slug} -> NULL`);
    } else if (status === 400) {
      // state: generic error? Disallowed (blocked) links use this, some
      // "invalid dynamic link" errors also use this.
      errorInsert(slug, status, result.statusText);
      console.log(`${slug} -> 400`);
    } else if (status === 302) {
      // state: this is an internal page. Store the status, at least.
      errorInsert(slug, status, result.statusText);
      console.log(`${slug} -> ${status}`);
    } else {
      // state: what the fuck?
      errorInsert(slug, status, result.statusText);
      console.log(`${slug} -> error (${status})`);
    }
    if (justOne) break;
  }
}

function parseThreadsArg(raw: string | undefined, dflt: number = 8) {
  if (typeof raw === "undefined") return dflt;
  const int = parseInt(raw);
  if (Number.isNaN(int) || int <= 0) {
    console.log("Invalid threads argument, using default");
    return dflt;
  }
  return int;
}

const parsedArgs = parseArgs({
  args: process.argv.slice(2),
  options: {
    threads: { type: "string" },

    prefix: { type: "string" },
    init: { type: "string" },
    until: { type: "string" },
    justOne: { type: "boolean" },
    scrapeJobFile: { type: "string" },

    slugArrayFile: { type: "string" },
    rudimentaryProgress: { type: "string" },
    help: { type: "boolean", short: "h" },
    mentionsExport: { type: "boolean" },
    mentionsScrape: { type: "boolean" },
    mentionsCount: { type: "boolean" },
  },
});

function writeDoneInfo() {
  appendFileSync("done.jsonl", JSON.stringify(process.argv.slice(2)) + "\n");
}

/**
 * Scrape everything in `slugs` in multiple concurrent "threads".
 */
async function scrapeArrayConcurrent(slugs: Slug[]) {
  await Promise.all(
    chunkN(shuffle(slugs), parseThreadsArg(parsedArgs.values.threads)).map(
      (arr) => scrape(arr, parsedArgs.values.prefix),
    ),
  );
  writeDoneInfo();
}

if (parsedArgs.values.help) {
  console.log(
    `goo.gl scraper

I refer to each short URL (like "abcd") as a "slug".

The default "command" is to brute force through every 1~6 char combination of
0-9A-Za-z, starting with "0" and ending with "zzzzzz".

Options:
--prefix <string>: add a prefix before the sequential slug.
  Using "--prefix foo" would brute force foo/0, foo/1, ..., foo/zzzzzz.
--init <slug>: start from this slug instead of "0".
--until <slug>: end the command after this slug instead of "zzzzzz".
  When using --init and --until together to control the "block" an invocation is
  responsible, this can effectively allow somewhat manually coordinating
  multiple jobs to run on different blocks of the possible space at the same time.

--justOne <slug>: Scrape just the next unscraped slug in the defined range.
  This allows seeing the "edge" of a block.
  Also applies for --scrapeJobFile.

--scrapeJobFile <file>: Scrape jobs defined in \`file\`.
  The file should contain JSON for an array of objects. Each object can specify
  "init", "until", and "prefix", which have the same meanings as the options
  above. For example, [{"init": "0","until":"00"}] is the same as passing
  "--init 0 --until 00" on the command line.

Commands:
--rudimentaryProgress <glob>: Return the largest slug matching \`glob\`.
  "Largest" is just based on SQLite's sorting. Notably, this sorts a000 above
  a0000, so it's only really useful with globs like "a????" where the character
  count is fixed.
  For blocks that have only ever been scraped sequentially, this provides a
  useful view on the progress.

Other commands:
--help, -h: Show this message.

--slugArrayFile <file>: Scrape slugs in \`file\` instead of sequentially.
  Sequential scraping is described below.
  \`file\` should be a JSON file containing an array of strings; each string
  should be a slug, like "abcd" or "fb/1234".
--threads <n>: Try this many concurrent fetches when applicable.
  Currently this is just for --mentionsScrape and --slugArrayFile.

--mentionsExport: Write mentioned slugs into ./mentioned-slugs.json.
  Some goo.gl links resolve into another goo.gl link. Others mention a goo.gl
  link within the resolved URL. This command and the next ones are for dealing
  with them.
--mentionsCount: Do mentionsExport, then print the number of mentions.
--mentionsScrape: Do mentionsExport, then scrape every mentioned slug.
  There are some links that are more than one level deep. This can be run in a
  loop in order to go through them.

`.trim(),
  );
} else if (typeof parsedArgs.values.rudimentaryProgress === "string") {
  const glob = parsedArgs.values.rudimentaryProgress;
  const stmt = db.prepare(
    "SELECT slug FROM mapping WHERE slug GLOB ? ORDER BY slug DESC LIMIT 1;",
  );
  const largest = (stmt.get(glob) as { slug: Slug } | null)?.slug;
  if (typeof largest === "string") {
    console.log(`Largest slug matching '${glob}' is ${largest}
("Largest" is decided by SQLite's descending ORDER BY)`);
  } else {
    console.log(`No slug matches ${glob}`);
  }
} else if (parsedArgs.values.mentionsExport) {
  writeMentions();
} else if (parsedArgs.values.mentionsCount) {
  writeMentions({ showCount: true });
} else if (parsedArgs.values.mentionsScrape) {
  writeMentions({ showCount: true });
  scrapeArrayConcurrent(getMentions());
} else if (typeof parsedArgs.values.slugArrayFile === "string") {
  scrapeArrayConcurrent(
    JSON.parse(
      readFileSync(parsedArgs.values.slugArrayFile, { encoding: "utf-8" }),
    ),
  );
} else if (typeof parsedArgs.values.scrapeJobFile === "string") {
  const jobs = JSON.parse(
    readFileSync(parsedArgs.values.scrapeJobFile, { encoding: "utf-8" }),
  ) as Array<{ init: Slug; until: Slug; prefix?: string | undefined }>;
  const justOne = parsedArgs.values.justOne;
  await Promise.all(
    jobs.map((job) => {
      console.log(`Starting job: ${JSON.stringify(job)}`);
      scrape(job.init, job.prefix, job.until, justOne).then(() => {
        if (!justOne) {
          appendFileSync("done.jsonl", JSON.stringify(job) + "\n");
        }
      });
    }),
  );
} else {
  const init = parsedArgs.values.init;
  const until = parsedArgs.values.until;
  const prefix = parsedArgs.values.prefix;
  const justOne = parsedArgs.values.justOne;
  // const threads = parseThreadsArg(parsedArgs.values.threads, 1);
  // const jobs: { init?: Slug; until?: Slug; prefix?: string }[] = [];
  // if (typeof init === "string" && typeof until === "string") {
  //   jobs.push(
  //     ...dividePortions(init, until, threads).map(([a, b]) => ({
  //       init: a,
  //       until: b,
  //       prefix: parsedArgs.values.prefix,
  //     })),
  //   );
  // } else {
  //   jobs.push({ init, until });
  // }
  // await Promise.all(
  //   jobs.map((job) => {
  //     console.log(`Starting job: ${JSON.stringify(job)}`);
  //     return scrape(job.init, job.prefix, job.until).then(() => {
  //       appendFileSync("done.jsonl", JSON.stringify(job) + "\n");
  //     });
  //   }),
  // );
  await scrape(init, prefix, until, justOne);
  if (!justOne) {
    writeDoneInfo();
  }
}
