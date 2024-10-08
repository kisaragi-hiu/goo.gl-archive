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

- 0~0000: done
- 0000~00000: done
  - Apart from `sbwz`, which is a 403 Forbidden.
- 00000~A0000: done
- A0000~B0000: done
- B0000~F0000: done
- F0000~J0000: done
- J0000~N0000: done
- N0000~R0000: done
- R0000~V0000: done
- V0000~Z0000: done
- Z0000~a0000: done
- a0000~b0000: done
- b0000~c0000: done
- c0000~g0000: done
- g0000~l0000: done
- l0000~q0000: done
- q0000~v0000: done
- v0000~000000: done
- 000000~zzzzzz: pending
- fb/0~0000: done
- fb/0000~00000: done
- fb/00000~zzzzzz: pending

## Schema

- table: mapping
  - slug: the “foo” in “goo.gl/foo”
  - value: either the URL which the slug expands to, or NULL for slugs that expand to nothing
- table: errors
  - slug: the “foo” in “goo.gl/foo”
  - status: the status that goo.gl returned when last tried
  - message: the statusText of the response
