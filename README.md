# An attempt at archiving goo.gl

## Archived links

- [Uses on LKML](https://lore.kernel.org/all/?q=goo.gl%2F) should all be stored, apart from usages of `images.app.goo.gl`, `maps.app.goo.gl`, and `photos.app.goo.gl`.
  - This was done by downloading the `mbox.gz` for the search from lore.kernel.org, running
  
    ```sh
    grep -o --text 'https\?://[^ ]*goo.gl[^ ]*' results-goo.gl.mbox > instances
    ```
    
    which yields about 600~800 instances after removing duplicates. Then I manually cleaned up some oddities that are the result of the imperfect grep or line wrapping on “=” breaking some URLs up.
- Others are basically just brute force.
  - “But (62 (0-9a-zA-Z) ^ 6) at 100 per second is still over 17 years of continuous work!”
  - Err, better than nothing, I guess

## Progress

- 0~0000: ongoing
- 0000~5000: ongoing
- 5000~a000: ongoing
- a000~b000: ongoing
- b000~c000: ongoing
- c000~d000: ongoing
- d000~e000: waiting
- e000~f000: waiting
- f000~g000: waiting
- g000~h000: waiting
- h000~i000: waiting
- i000~j000: waiting
- j000~k000: waiting
- k000~l000: waiting
- l000~m000: waiting
- m000~n000: waiting
- n000~o000: waiting
- o000~p000: waiting
- p000~ZZZZ: waiting
- ZZZZ~ZZZZZZ: waiting
- fb/0~a00: ongoing
- fb/a00~a000: ongoing
- fb/a000~b000: ongoing
- fb/b000~c000: waiting
- fb/c000~d000: waiting
- fb/d000~e000: waiting
- fb/e000~f000: waiting
- fb/f000~g000: waiting
- fb/g000~h000: waiting
- fb/h000~i000: waiting
- fb/i000~j000: waiting
- fb/j000~k000: waiting
- fb/k000~l000: waiting
- fb/l000~m000: waiting
- fb/m000~n000: waiting
- fb/n000~o000: waiting
- fb/o000~p000: waiting
- fb/p000~ZZZZZZ: waiting

## Schema

- table: mapping
  - slug: the “foo” in “goo.gl/foo”
  - value: either the URL which the slug expands to, or NULL for slugs that expand to nothing
- table: errors
  - slug: the “foo” in “goo.gl/foo”
  - status: the status that goo.gl returned when last tried
  - message: the statusText of the response
