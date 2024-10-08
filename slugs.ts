// A "slug" is the "abcde" in "goo.gl/abcde".

export type Slug = string;

/* Iterating */

const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
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
 *
 * If `until` is given, also stop when reaching `until` (inclusive).
 *
 * If `prefix` is provided, make the slug "${prefix}/${slug}" instead. Some prefixes:
 * - /fb/ for feedburner.com URLs
 * - /maps/ for Google Maps - are these impacted?
 */
export function* slugs(
  init?: Slug,
  until?: Slug,
  prefix?: string,
): Generator<string, void, unknown> {
  let current = init || chars[0];
  // I don't want to return any 7 digit slugs
  while (current.length < 7) {
    if (typeof prefix === "undefined") {
      yield current;
    } else {
      yield `${prefix}/${current}`;
    }
    // NOTE: doing this here makes it so that until is inclusive
    // FIXME: "larger than" `until` should also cause it to stop
    if (current === until) break;
    current = nextSlug(current);
  }
}

/**
 * Remove `prefix` from `slug`.
 */
export function removePrefix(slug: Slug, prefix: string | undefined) {
  if (typeof prefix === "undefined") return slug;
  // FIXME: `prefix` is parsed as a regexp. This needs RegExp.escape to be fixed
  // (or another escaping library)
  return slug.replace(RegExp(`^${prefix}/`), "");
}

export function slugToNumber(slug: Slug): number {
  const reversed = [...slug].reverse();
  const len = slug.length;
  const charCount = chars.length;
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const value = charIndexMap.get(reversed[i]);
    if (typeof value === "undefined") {
      throw new Error(`${slug} is not a valid slug`);
    }
    // "0" is 1, 1 + "z" is "00"
    // If the first char has a value of 0 then "00" would be the same as "0".
    sum += (value + 1) * charCount ** i;
  }
  return sum - 1; // correct it back so that "0" is still 0, however.
}

export function numberToSlug(n: number): Slug {
  const charCount = chars.length;
  // "0" has a value of 1
  let tmp = n + 1;
  let finalDigitCount = 1;
  for (let i = 0; true; i++) {
    if (n / charCount ** i < 1) {
      finalDigitCount = Math.max(i, 1);
      break;
    }
  }
  const newdigits: string[] = [];
  for (let power = finalDigitCount - 1; power >= 0; power--) {
    const digitValue = Math.floor(tmp / charCount ** power);
    const char = chars.at(digitValue - 1);
    newdigits.push(char);
    tmp -= digitValue * charCount ** power;
  }
  return newdigits.join("");
}

// Ground truth implementation, except this is O(length^62).
// function slugToNumber(slug: Slug): number {
//   let n = 0;
//   for (const s of slugs()) {
//     if (s === slug) break;
//     if (s.length > slug.length) throw new Error(`${slug} is not a valid slug`);
//     n++;
//   }
//   return n;
// }
//
// Ground truth implementation, except this is O(n) for the number, O(length^62)
// for the corresponding slug. In other words, unusable.
// I'm not able to divide-and-conquer without a way to add slugs directly
// const numberToSlugMap = new Map() as Map<number, Slug>;
// function numberToSlug(n: number): Slug {
//   const cached = numberToSlugMap.get(n);
//   if (typeof cached !== "undefined") return cached;
//   let i = 0;
//   for (const s of slugs()) {
//     if (i === n) {
//       numberToSlugMap.set(n, s);
//       return s;
//     }
//     if (i > n) break;
//     i++;
//   }
//   throw new Error(`${n} is not valid`);
// }

/**
 * Use `body` to perform some calculation on `slugs`.
 * Each one of `slugs` will be converted into a number and passed into `body`;
 * the resulting number of `body` would be converted back into a Slug.
 * @example arith(["a000", "b000"], ([a, b]) => (a + b) / 2)
 */
function arith(slugs: Slug[], body: (numbers: number[]) => number): Slug {
  return numberToSlug(body(slugs.map(slugToNumber)));
}

/**
 * Given a range [a, b], return `n` ranges that divide [a, b] roughly evenly.
 */
export function dividePortions(a: Slug, b: Slug, n: number): [Slug, Slug][] {
  if (n === 1) return [[a, b]];
  const an = slugToNumber(a);
  const bn = slugToNumber(b);
  const portionSize = Math.floor(Math.abs(an - bn) / n);
  const portions: [Slug, Slug][] = [];
  let current = an;
  // The * 2 is to prevent something like [[0, 4], [4, 8], [8, 9]]
  // I want the last part to be larger than the portionSize
  while (current + portionSize * 2 <= bn) {
    portions.push([numberToSlug(current), numberToSlug(current + portionSize)]);
    current += portionSize;
  }
  portions.push([numberToSlug(current), b]);
  return portions;
}

/** Take `portions` and convert it to ready-to-copy JSON. */
function portionsToJobs(portions: [Slug, Slug][]) {
  return portions.map(([init, until]) => ({ init, until }));
}

function divideJobs(
  jobs: { prefix?: string; init: Slug; until: Slug }[],
  n: number,
) {
  const newJobs: typeof jobs = [];
  for (const job of jobs) {
    newJobs.push(
      ...dividePortions(job.init, job.until, n).map(([a, b]) => ({
        prefix: job.prefix,
        init: a,
        until: b,
      })),
    );
  }
  return newJobs;
}
