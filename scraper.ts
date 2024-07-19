import { Database } from "bun:sqlite";

const db = new Database("data.sqlite", { create: true, strict: true });
db.run("CREATE TABLE IF NOT EXISTS mapping (slug TEXT UNIQUE, value TEXT)");
db.run(
  "CREATE TABLE IF NOT EXISTS errors (slug TEXT UNIQUE, status INTEGER, message TEXT)",
);

// A goo.gl link is goo.gl/[slug] which maps to the original URL

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
function nextChar(char: string) {
  const index = charIndexMap.get(char);
  if (typeof index === "undefined") throw new Error("Invalid character");
  return chars[index + 1];
}

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

function* slugs(init?: Slug) {
  let current = init || "a";
  while (current.length < 2) {
    yield current;
    current = nextSlug(current);
  }
}

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
