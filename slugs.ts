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
 * If `until` is given, also stop when reaching `until`.
 */
export function* slugs(
  init?: Slug,
  until?: Slug,
): Generator<string, void, unknown> {
  let current = init || chars[0];
  // FIXME: "larger than" `until` should also cause it to stop
  while (current.length < 7 && current !== until) {
    yield current;
    current = nextSlug(current);
  }
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

function slugToNumber(slug: Slug): number {
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

// Ground truth implementation, except this is O(n).
function numberToSlug(n: number): Slug {
  let i = 0;
  for (const s of slugs()) {
    if (i === n) return s;
    if (i > n) break;
    i++;
  }
  throw new Error(`${n} is not valid`);
}
