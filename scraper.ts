import { Database } from "bun:sqlite";
import { parseArgs } from "node:util";

const db = new Database("data.sqlite", { create: true, strict: true });
db.run("PRAGMA journal_mode=WAL;");
db.run("PRAGMA busy_timeout=100");
db.run("CREATE TABLE IF NOT EXISTS mapping (slug TEXT UNIQUE, value TEXT)");
db.run(
  "CREATE TABLE IF NOT EXISTS errors (slug TEXT UNIQUE, status INTEGER, message TEXT)",
);

// A "slug" is the "abcde" in "goo.gl/abcde".

type Slug = string;

/* Writing */

const slugStoredStmt = db.query("SELECT slug FROM mapping WHERE slug = ?");
function slugStored(slug: Slug) {
  return !!slugStoredStmt.get(slug);
}

const slugError400Stmt = db.query(
  "SELECT slug FROM errors WHERE status = 400 AND slug = ?",
);
function slugError400(slug: Slug) {
  return !!slugError400Stmt.get(slug);
}

const slugInsertStmt = db.query(`
INSERT INTO mapping (slug, value) VALUES (?, ?)
`);
function slugInsert(slug: Slug, value: string | null) {
  return slugInsertStmt.run(slug, value);
}

const errorInsertStmt = db.query(`
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
function writeCurrentSlugs() {
  Bun.write(
    "external-slugs.json",
    JSON.stringify(
      db
        .query("select slug from mapping")
        .all()
        .map((obj) => (obj as { slug: Slug }).slug),
    ),
  );
}

async function readExternalSlugs(): Promise<Slug[]> {
  try {
    return (await Bun.file("external-slugs.json").json()) as Slug[];
  } catch (_e) {
    return [];
  }
}

const externalSlugs = new Set(await readExternalSlugs());

function slugStoredExternally(slug: Slug) {
  return externalSlugs.has(slug);
}

/* Iterating */

const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const charIndexMap = new Map([...chars].map((c, i) => [c, i]));
/**
 * Return the next character after `char` in the valid character sequence.
 * The sequence is basically a-zA-Z0-9.
 * An error is thrown if `char` is not in the sequence.
 *
 * Returns undefined as the character after the last character. It is up to the
 * caller to handle that correctly, doing carry or wrapping around as appropriate.
 */
function nextChar(char: string) {
  const index = charIndexMap.get(char);
  if (typeof index === "undefined") throw new Error("Invalid character");
  return chars[index + 1];
}

/**
 * Return the slug that's one bigger than `slug`.
 * For example, the slug after "aaa" is "aab", and the one after "999" is "aaaa".
 */
function nextSlug(slug: Slug) {
  let carry = true;
  const newChars = [];
  for (let i = slug.length - 1; i >= 0; i--) {
    if (carry) {
      const next = nextChar(slug[i]);
      if (typeof next === "string") {
        newChars.push(next);
        carry = false;
      } else {
        newChars.push(chars[0]);
      }
    } else {
      newChars.push(slug[i]);
    }
  }
  // If carry is still true, that means we've just reached eg. "999".
  if (carry) newChars.push(chars[0]);
  return newChars.reverse().join("");
}

/**
 * Return a sequence of slugs starting from `init`, until it reaches the maximum
 * value in 6 digits.
 * If `until` is given, also stop when reaching `until`.
 */
function* slugs(init?: Slug, until?: Slug) {
  let current = init || chars[0];
  // FIXME: "larger than" `until` should also cause it to stop
  while (current.length < 7 && current !== until) {
    yield current;
    current = nextSlug(current);
  }
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
async function scrape(init?: Slug | Slug[], prefix?: string, until?: Slug) {
  for (const it of Array.isArray(init) ? init : slugs(init, until)) {
    const slug = prefix ? `${prefix}/${it}` : it;
    if (slugStoredExternally(slug) || slugStored(slug) || slugError400(slug)) {
      // console.log(`"${slug}" already stored`);
      continue;
    }
    console.write(`${slug} -> `);
    const result = await fetch(`https://goo.gl/${slug}`, {
      method: "head",
      redirect: "manual",
    });
    if (result.status === 301 || result.status === 302) {
      const location = result.headers.get("location");
      if (typeof location === "string") {
        // state: resolved to a URL
        slugInsert(slug, location);
        console.write(`${location}\n`);
      } else {
        // state: 301/302 but no location
      }
    } else if (result.status === 404) {
      // state: resolved to no mapping
      slugInsert(slug, null);
      console.write(`NULL\n`);
    } else if (result.status === 400) {
      // state: generic error? Disallowed (blocked) links use this, some
      // "invalid dynamic link" errors also use this.
      errorInsert(slug, result.status, result.statusText);
      console.write(`400\n`);
    } else if (result.status === 302) {
      // state: this is an internal page. Store the status, at least.
      errorInsert(slug, result.status, result.statusText);
      console.write(`${result.status}\n`);
    } else {
      // state: what the fuck?
      errorInsert(slug, result.status, result.statusText);
      console.write(`error (${result.status})\n`);
    }
  }
}

const parsedArgs = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    init: { type: "string" },
    slugArrayFile: { type: "string" },
    prefix: { type: "string" },
    until: { type: "string" },
    export: { type: "boolean" },
  },
});

if (parsedArgs.values.export) {
  writeCurrentSlugs();
  console.log("Current slugs have been written to external-slugs.json");
} else if (typeof parsedArgs.values.slugArrayFile === "string") {
  await scrape(
    await Bun.file(parsedArgs.values.slugArrayFile).json(),
    parsedArgs.values.prefix,
  );
} else {
  await scrape(
    parsedArgs.values.init,
    parsedArgs.values.prefix,
    parsedArgs.values.until,
  );
}
