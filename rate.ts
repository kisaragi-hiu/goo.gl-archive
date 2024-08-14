import type { Database as BunDatabase } from "bun:sqlite";
import { Readline } from "node:readline/promises";
import { existsSync } from "node:fs";

const Database = (process.isBun
  ? (await import("bun:sqlite")).Database
  : (await import("better-sqlite3")).default) as unknown as typeof BunDatabase;

const db = new Database("data.sqlite");
if (existsSync("libsqlite_zstd.so")) {
  db.loadExtension("./libsqlite_zstd.so");
} else {
}
const rl = new Readline(process.stdout, { autoCommit: true });

// Take advantage of the fact that we're using auto increment
// This is way faster than select count().
const entryCountStmt = db.prepare(`
select id from mapping
order by id desc
limit 1;`);
let lastCountedTime = new Date();
let lastCount = 0;

function showRate() {
  const currentTime = new Date();
  const deltaMs = currentTime.getTime() - lastCountedTime.getTime();
  // if (deltaMs < 10 * 1000) {
  //   return;
  // }
  const newCount = (entryCountStmt.get() as { rowid: number } | null)?.rowid;
  if (typeof newCount === "undefined") {
    return;
  }
  if (lastCount !== 0) {
    const perSecond = (newCount - lastCount) / (deltaMs / 1000);
    rl.cursorTo(0);
    // HACK: if the digit count goes down, the space will avoid leaving over
    // an "s".
    console.write(`Rate of adding new slugs: ${Math.floor(perSecond)}/s `);
  }
  lastCount = newCount;
  lastCountedTime = currentTime;
}

setInterval(() => {
  showRate();
}, 1000);
