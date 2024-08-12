import { Database } from "bun:sqlite";
import { parseArgs } from "node:util";
import { existsSync } from "node:fs";

function insertDbInto({
  target,
  source,
}: {
  target: Database;
  source: string;
}) {
  target.run(`attach ? as second;`, [source]);
  target.run(`PRAGMA journal_mode=DELETE;`);
  console.log(`Inserting ${source}`);
  console.log("  mapping...");
  // target.run(`BEGIN;`);
  target.run(`INSERT OR REPLACE INTO mapping SELECT * FROM second.mapping`);
  console.log("  errors...");
  target.run(`INSERT OR REPLACE INTO errors SELECT * FROM second.errors`);
  // target.run(`COMMIT;`);
  console.log("  done");
  target.run(`detach second;`);
}

async function main() {
  const parsedArgs = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      db: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const dbFile = parsedArgs.values.db ?? "all.sqlite";
  if (parsedArgs.values.help) {
    console.log(`${process.argv[1]} FILES...

Merge sqlite FILES into all.sqlite.

Options:
  --db <file>: write into this file instead of all.sqlite
  --help: show help (this message)`);
  } else {
    const target = new Database(dbFile, { create: false, strict: true });
    for (const file of parsedArgs.positionals) {
      if (!existsSync(file)) throw new Error(`${file} does not exist!`);
      insertDbInto({ target: target, source: file });
    }
  }
}

main();
