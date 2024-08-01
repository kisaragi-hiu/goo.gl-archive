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
import { roundRobin } from "iter-tools-es";

import type { Slug } from "./slugs.ts";
import { slugs, slugToNumber } from "./slugs.ts";

const parsedArgs = parseArgs({
  args: process.argv.slice(2),
  options: {
    threads: { type: "string" },

    db: { type: "string" },

    prefix: { type: "string" },
    init: { type: "string" },
    until: { type: "string" },
    justOne: { type: "boolean" },
    scrapeJobFile: { type: "string" },
    returnProgress: { type: "boolean" },

    slugArrayFile: { type: "string" },
    rudimentaryProgress: { type: "string" },
    help: { type: "boolean", short: "h" },
    mentionsExport: { type: "boolean" },
    mentionsScrape: { type: "boolean" },
    mentionsCount: { type: "boolean" },
  },
});

const db = new Database(parsedArgs.values.db ?? "data.sqlite");
// TODO: consider dropping "message" since we're only saving statusText in it.
// statusText is redundant with status.
db.exec(`
PRAGMA busy_timeout=5000;
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

function formatPercent(n: number) {
  // times 100 to convert to the written percentage (0.12 = "12"%)
  // times another 100 to preserve 2 digits through Math.floor
  return `${Math.floor(n * 100 * 100) / 100}%`;
}

/* Writing */

const slugStoredStmt = db.prepare("SELECT slug FROM mapping WHERE slug = ?");
const slugErrorStatusStmt = db.prepare(
  "SELECT status FROM errors WHERE slug = ?",
);
function slugStored(slug: Slug) {
  return (
    !!slugStoredStmt.get(slug) ||
    [400, 500, 403].includes(
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
INSERT INTO errors (slug, status) VALUES (?, ?)
  ON CONFLICT(slug)
  DO UPDATE SET
    status=excluded.status;
`);
function errorInsert(slug: Slug, status: number) {
  return errorInsertStmt.run(slug, status);
}

/* Reading DB */

/**
 * Get the minimum unscraped slug between `init` and `until`.
 * `prefix` is like in the `slugs` function.
 */
function getMinUnscraped(init: Slug, until: Slug, prefix?: string) {
  for (const slug of slugs(init, until, prefix)) {
    if (slugStored(slug)) continue;
    return slug;
  }
  // Everything between `init` and `until` have been scraped.
  return undefined;
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

/**
 * Write mentions to "mentioned-slugs.json", then return them.
 * If `showCount` is true, also show how many mentions there are.
 */
function writeMentions(options: { showCount?: boolean } = {}) {
  const mentions = getMentions();
  writeFileSync("mentioned-slugs.json", JSON.stringify(mentions));
  console.log(
    "Slugs mentioned in the current values have been written to mentioned-slugs.json",
  );
  if (options.showCount)
    console.log(`There are ${mentions.length} mentioned slugs`);
  return mentions;
}

/**
 * Do the actual scraping for one slug.
 */
async function scrapeSlug(slug: Slug) {
  if (slugStored(slug)) {
    // console.log(`"${slug}" already stored`);
    return "skipped";
  }
  // From 2024-08-23, some requests will start being served an "interstitial page".
  // The "si=1" query param is offered to suppress this behavior.
  //
  // The deadline for the whole ordeal is 2025-08-25.
  const fetchUrl = `https://goo.gl/${slug}?si=1`;
  const fetchOptions = {
    method: "head",
    redirect: "manual",
    headers: new Headers({
      "User-Agent": "kisaragi-hiu/goo.gl-archive",
    }),
  } satisfies FetchRequestInit;
  const result = await fetch(fetchUrl, fetchOptions);
  const status = result.status;
  if (status === 301 || status === 302) {
    const location = result.headers.get("location");
    if (typeof location === "string") {
      // state: resolved to a URL
      slugInsert(slug, location);
      console.log(`${slug} -> ${location}`);
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
    errorInsert(slug, status);
    console.log(`${slug} -> 400`);
  } else if (status === 302) {
    // state: this is an internal page. Store the status, at least.
    errorInsert(slug, status);
    console.log(`${slug} -> ${status}`);
  } else {
    // state: what the fuck?
    errorInsert(slug, status);
    console.log(`${slug} -> error (${status})`);
  }
}

/**
 * Do the actual scraping.
 *
 * Obtain slugs from `iter`. Common values include an array or the returned
 * generator from the `slugs` function.
 *
 * Will attempt to scrape as many slugs at once as `threads`.
 *
 * If `justOne` is true, scrape one then immediately return. This helps to see
 * the edges of blocks.
 *
 * If `slugFn` is provided, call that function for each slug.
 *
 * Already successfully stored values (including 404, which is a valid value for
 * "this resolves to nothing") are skipped, while errors are stored into a
 * separate table.
 */
async function scrape(
  iter: Iterable<string>,
  /** Scrape just one slug, then return. */
  justOne?: boolean,
  threads: number = 1,
  slugFn?: (slug: Slug) => void,
): Promise<void> {
  const iterator = iter[Symbol.iterator]();
  const workers: unknown[] = [];
  if (justOne) {
    workers.push(0); // just one worker
  } else {
    // as many "workers" as in the `threads` argument
    for (let i = threads; i > 0; i--) {
      workers.push(0);
    }
  }
  await Promise.all(
    workers.map(async () => {
      let next = iterator.next();
      let allSkippedSoFar = true;
      while (!next.done) {
        const slug = next.value;
        const result = await scrapeSlug(slug);
        if (allSkippedSoFar && result !== "skipped") {
          allSkippedSoFar = false;
        }
        if (justOne && !allSkippedSoFar) {
          break;
        }
        if (typeof slugFn !== "undefined") {
          slugFn(slug);
        }
        next = iterator.next();
      }
    }),
  );
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

function writeDoneInfo() {
  appendFileSync("done.jsonl", JSON.stringify(process.argv.slice(2)) + "\n");
}

if (parsedArgs.values.help) {
  console.log(
    `goo.gl scraper

I refer to each short URL (like "abcd") as a "slug".

The default "command" is to brute force through every 1~6 char combination of
0-9A-Za-z, starting with "0" and ending with "zzzzzz".

Options:
--db <path>: read and write data from/into this file.
  Default: "data.sqlite"
--threads <n>: Run this many concurrent fetches at once.
--prefix <string>: add a prefix before the sequential slug.
  Using "--prefix foo" would brute force foo/0, foo/1, ..., foo/zzzzzz.
--init <slug>: start from this slug instead of "0".
--until <slug>: end the command after this slug instead of "zzzzzz".
  When using --init and --until together to control the "block" an invocation is
  responsible, this can effectively allow somewhat manually coordinating
  multiple invocations to run on different blocks of the possible space at the
  same time.
--justOne <slug>: Scrape just the next unscraped slug in the defined range.
  This allows seeing the "edge" of a block.
  Also applies for --scrapeJobFile.
--scrapeJobFile <file>: Scrape jobs defined in \`file\`.
  The file should contain JSON for an array of objects. Each object can specify
  "init", "until", and "prefix", which have the same meanings as the options
  above. For example, [{"init": "0","until":"00"}] is the same as passing
  "--init 0 --until 00" on the command line.
--returnProgress: use together with scrapeJobFile.
  Return the smallest unscraped value of each block.

Other commands:
--rudimentaryProgress <glob>: Return the largest slug matching \`glob\`.
  "Largest" is just based on SQLite's sorting. Notably, this sorts a000 above
  a0000, so it's only really useful with globs like "a????" where the character
  count is fixed.
  For blocks that have only ever been scraped sequentially, this provides a
  useful view on the progress.

--help, -h: Show this message.

--slugArrayFile <file>: Scrape slugs in \`file\` instead of sequentially.
  Sequential scraping is described below.
  \`file\` should be a JSON file containing an array of strings; each string
  should be a slug, like "abcd" or "fb/1234".

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
  const mentions = writeMentions({ showCount: true });
  scrape(mentions, false, parseThreadsArg(parsedArgs.values.threads));
  writeDoneInfo();
} else if (typeof parsedArgs.values.slugArrayFile === "string") {
  const slugs = JSON.parse(
    readFileSync(parsedArgs.values.slugArrayFile, { encoding: "utf-8" }),
  );
  if (parsedArgs.values.returnProgress) {
    let done = 0;
    for (const slug of slugs) {
      if (slugStored(slug)) done++;
    }
    console.log(
      `${done} / ${slugs.length} (${formatPercent(done / slugs.length)})`,
    );
  } else {
    scrape(slugs, false, parseThreadsArg(parsedArgs.values.threads));
    writeDoneInfo();
  }
} else if (typeof parsedArgs.values.scrapeJobFile === "string") {
  const jobs = (await import(`./${parsedArgs.values.scrapeJobFile}`))
    .default as Array<{
    init: Slug;
    until: Slug;
    prefix?: string | undefined;
  }>;
  if (parsedArgs.values.returnProgress) {
    for (const { init, until, prefix } of jobs) {
      const minUnscraped = getMinUnscraped(init, until, prefix);
      if (typeof minUnscraped === "undefined") {
        console.log(`${prefix ? prefix + ": " : ""}${init}~${until}: done`);
      } else {
        const percent = formatPercent(
          (slugToNumber(minUnscraped) - slugToNumber(init)) /
            (slugToNumber(until) - slugToNumber(init)),
        );
        console.log(
          `${prefix ? prefix + ": " : ""}${init}~${until}: ${minUnscraped} (${percent}%)`,
        );
      }
    }
  } else {
    const { justOne, threads } = parsedArgs.values;
    const iterators = jobs.map((job) =>
      slugs(job.init, job.until, job.prefix)[Symbol.iterator](),
    );
    /** For speeding up access from until to job. */
    const jobsMap = new Map(
      jobs.map((job) => {
        const untilSlug = job.prefix ? `${job.prefix}/${job.until}` : job.until;
        return [untilSlug, job];
      }),
    );
    const seenInitSlugs: Set<Slug> = new Set();
    await scrape(
      roundRobin(...iterators),
      justOne,
      parseThreadsArg(threads),
      (slug) => {
        const job = jobsMap.get(slug);
        // Although we're iterating in different blocks, we're always iterating
        // up. So if an "until" slug has been scraped, that means its
        // corresponding job is likely now done.
        if (typeof job !== "undefined") {
          // If the until of the block is the init of another block, the first
          // time we see it would be for that other block, so skip it and
          // remember that.
          // The 2nd time (or (1 + <number of blocks whose init is it>)-th time)
          // it is seen, we report it as done as usual.
          // Assumptions:
          // - We assume no more than two blocks have the same init or until.
          //   This could be fixed by tracking the number instead of using a
          //   boolean, but the blocks could also just be well formed.
          // - We also assume no blocks are overlapping elsewhere.
          if (
            !seenInitSlugs.has(slug) &&
            jobs.some(({ init }) => init === job.until)
          ) {
            seenInitSlugs.add(slug);
            return;
          }
          console.log(`done: ${JSON.stringify(job)}`);
          appendFileSync("done.jsonl", JSON.stringify(job) + "\n");
        }
      },
    );
  }
} else {
  const { init, until, prefix, justOne, threads } = parsedArgs.values;
  await scrape(slugs(init, until, prefix), justOne, parseThreadsArg(threads));
  if (!justOne) {
    writeDoneInfo();
  }
}
