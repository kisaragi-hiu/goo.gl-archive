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
- 0000~1000: done
- 1000~2000: done
- 2000~3000: B
- 3000~4000: A
- 4000~5000: pending
- 5000~a000: A
- a000~b000: A
- b000~c000: done
- c000~d000: pending
- d000~e000: done
- e000~f000: pending
- f000~g000: pending
- g000~h000: done
- h000~i000: pending
- i000~j000: pending
- j000~k000: pending
- k000~l000: B
- l000~m000: pending
- m000~n000: pending
- n000~o000: pending
- o000~p000: pending
- p000~q000: B
- q000~r000: C
- r000~s000: C
- s000~t000: pending
- t000~u000: pending
- u000~v000: pending
- v000~w000: C
- w000~x000: C
- x000~y000: C
- y000~z000: C
- z000~A000: pending
- A000~B000: pending
- B000~C000: pending
- C000~D000: pending
- D000~E000: done
- E000~F000: done
- F000~G000: done
- G000~H000: A
- H000~I000: done
- I000~J000: A
- J000~K000: A
- K000~L000: B
- L000~M000: B
- M000~N000: done
- N000~R000: B
- R000~S000: done
- S000~T000: pending
- T000~U000: pending
- U000~V000: pending
- V000~W000: pending
- W000~X000: pending
- X000~Y000: pending
- Y000~Z000: A
- Z000~ZZZZ: B
- ZZZZ~ZZZZZZ: pending
- fb/0~a00: done
- fb/a00~1000: done
- fb/1000~2000: A
- fb/2000~3000: pending
- fb/3000~4000: pending
- fb/4000~5000: pending
- fb/5000~a000: pending
- fb/a000~b000: done
- fb/b000~c000: B
- fb/c000~d000: B
- fb/d000~e000: A
- fb/e000~f000: pending
- fb/f000~g000: pending
- fb/g000~h000: B
- fb/h000~i000: pending
- fb/i000~j000: pending
- fb/j000~k000: done
- fb/k000~l000: pending
- fb/l000~m000: pending
- fb/m000~n000: pending
- fb/n000~o000: pending
- fb/o000~p000: B
- fb/p000~q000: pending
- fb/q000~r000: pending
- fb/r000~s000: pending
- fb/s000~t000: pending
- fb/t000~u000: pending
- fb/u000~v000: pending
- fb/v000~w000: pending
- fb/w000~x000: pending
- fb/x000~y000: pending
- fb/y000~z000: pending
- fb/z000~A000: pending
- fb/A000~B000: pending
- fb/B000~C000: pending
- fb/C000~D000: B
- fb/D000~ZZZZZZ: pending

## Schema

- table: mapping
  - slug: the “foo” in “goo.gl/foo”
  - value: either the URL which the slug expands to, or NULL for slugs that expand to nothing
- table: errors
  - slug: the “foo” in “goo.gl/foo”
  - status: the status that goo.gl returned when last tried
  - message: the statusText of the response
