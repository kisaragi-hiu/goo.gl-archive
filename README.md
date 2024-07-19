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
- 0000~ZZZZ: ongoing
- aaaa~dddd: waiting
- dddd~ZZZZ: waiting
- dddd~ZZZZ: waiting
- ZZZZ~ZZZZZZ: waiting
- fb/0~a00: ongoing
- fb/a00~a000: waiting
- fb/a000~b000: ongoing
- fb/b000~ZZZZZZ: waiting

## Schema

- table: mapping
  - slug: the “foo” in “goo.gl/foo”
  - value: either the URL which the slug expands to, or NULL for slugs that expand to nothing
- table: errors
  - slug: the “foo” in “goo.gl/foo”
  - status: the status that goo.gl returned when last tried
  - message: the statusText of the response
