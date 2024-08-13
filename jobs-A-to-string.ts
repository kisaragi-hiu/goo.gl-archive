/**
 * Turn the range in jobs-A.ts into a string.
 *
 * Separate file because Node provides no mechanism for testing if a file is run
 * directly (as the main module) or being required / imported by something else.
 * Unless you use https://www.npmjs.com/package/es-main, I guess
 */

const currentJobs = (await import("./jobs-A.ts")).default;

const first = currentJobs.at(0)?.init ?? "";
const last = currentJobs.at(-1)?.until ?? "";
const prefix = currentJobs.at(0)?.prefix;

if (typeof prefix === "string") {
  console.log(`${prefix}-${first}-${prefix}-${last}`);
} else {
  console.log(`${first}-${last}`);
}
