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
db.run(`BEGIN;`);
db.run(`INSERT INTO mapping SELECT * FROM second.mapping
  ON CONFLICT(slug)
  DO UPDATE SET
    value=excluded.value;`);
db.run(`INSERT INTO errors SELECT * FROM second.errors
  ON CONFLICT(slug)
  DO UPDATE SET
    status=excluded.status,
    message=excluded.message;`);
db.run(`COMMIT;`);
db.run(`detach second;`);
