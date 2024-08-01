import { Database } from "bun:sqlite";

const firstFile = Bun.argv[2];
const secondFile = Bun.argv[3];

if (firstFile === "--help" || firstFile == "-h") {
  console.log(`${Bun.argv[1]} <first> <second>

Merge rows from <second> into <first>.

The <second> argument is replaced straight into a query, so do not pass
untrusted input into it.`);
}

const db = new Database(firstFile, { create: false, strict: true });
db.run(`attach '${secondFile}' as second;`);
db.run(`PRAGMA journal_mode=DELETE;`);
console.log("Inserting mapping");
// db.run(`BEGIN;`);
db.run(`INSERT OR REPLACE INTO mapping SELECT * FROM second.mapping`);
console.log("Inserting errors");
db.run(`INSERT OR REPLACE INTO errors SELECT * FROM second.errors`);
// db.run(`COMMIT;`);
console.log("Done");
db.run(`detach second;`);
