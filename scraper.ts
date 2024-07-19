import { Database } from "bun:sqlite";

const db = new Database("data.sqlite", { create: true, strict: true });
db.run("PRAGMA journal_mode=WAL;");
db.run("CREATE TABLE IF NOT EXISTS mapping (slug TEXT UNIQUE, value TEXT)");
db.run(
  "CREATE TABLE IF NOT EXISTS errors (slug TEXT UNIQUE, status INTEGER, message TEXT)",
);

// A "slug" is the "abcde" in "goo.gl/abcde".

type Slug = string;

const slugStoredStmt = db.query("SELECT slug FROM mapping WHERE slug = ?");
function slugStored(slug: Slug) {
  return !!slugStoredStmt.get(slug);
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

const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const charIndexMap = new Map([...chars].map((c, i) => [c, i]));
/**
 * Return the next character after `char` in the valid character sequence.
 * The sequence is basically a-zA-Z.
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
 * For example, the slug after "aaa" is "aab", and the one after "ZZZ" is "aaaa".
 *
 * In effect these are base-52 numbers written with a-zA-Z, and this function
 * increments the input.
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
  // If carry is still true, that means we've just reached eg. "ZZZ".
  if (carry) newChars.push(chars[0]);
  return newChars.reverse().join("");
}

/**
 * Return an infinite sequence of slugs starting from `init`.
 */
function* slugs(init?: Slug) {
  let current = init || "a";
  while (current.length < 2) {
    yield current;
    current = nextSlug(current);
  }
}

/**
 * Do the actual scraping.
 * Start from the slug given as `init`.
 * Already successfully stored values (including 404, which is a valid value for
 * "this resolves to nothing") are skipped, while errors are stored into a
 * separate table.
 */
async function scrape(init?: Slug) {
  for (const slug of slugs(init)) {
    if (slugStored(slug)) {
      console.log(`"${slug}" already stored`);
      continue;
    }
    console.log(`Storing "${slug}"`);
    const result = await fetch(`https://goo.gl/${slug}`, {
      method: "head",
      redirect: "manual",
    });
    if (result.status === 301 || result.status === 302) {
      const location = result.headers.get("location");
      if (typeof location === "string") {
        // state: resolved to a URL
        slugInsert(slug, location);
      } else {
        // state: 301/302 but no location
      }
    } else if (result.status === 404) {
      // state: resolved to no mapping
      slugInsert(slug, null);
    } else {
      // state: what the fuck?
      errorInsert(slug, result.status, result.statusText);
    }
  }
}
