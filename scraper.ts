import { Database } from "bun:sqlite";

const db = new Database("data.sqlite", { create: true, strict: true });
db.run("CREATE TABLE IF NOT EXISTS mapping (slug TEXT UNIQUE, value TEXT)");

// A goo.gl link is goo.gl/[slug] which maps to the original URL

type Slug = string;

const slugStoredStmt = db.query("SELECT value FROM mapping WHERE slug = ?");
function slugStored(slug: Slug) {
  return !!slugStoredStmt.get(slug);
}

const slugInsertStmt = db.query(`
INSERT INTO mapping (slug, value) VALUES (?, ?)
  ON CONFLICT(slug) 
  DO UPDATE SET value=excluded.value;
`);
function slugInsert(slug: Slug, value: string) {
  return slugInsertStmt.run(slug, value);
}

const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const charIndexMap = new Map([...chars].map((c, i) => [c, i]));
function nextChar(char: string) {
  return chars[charIndexMap.get(char) + 1];
}

function nextSlug(slug: Slug): Slug {
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
