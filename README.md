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

- 0~2000: done
- 2000~5000: B
- 5000~7000: done
- 7000~a000: B
- a000~c000: done
- c000~f000: B
- f000~g000: pending
- g000~h000: done
- h000~i000: pending
- i000~j000: pending
- j000~k000: pending
- k000~l000: done
- l000~m000: pending
- m000~n000: pending
- n000~o000: pending
- o000~p000: pending
- p000~q000: done
- q000~r000: C
- r000~s000: C
- s000~t000: pending
- t000~u000: pending
- u000~v000: pending
- v000~w000: C
- w000~x000: C
- x000~y000: C
- y000~z000: C
- z000~B000: B
- B000~D000: B
- D000~G000: done
- G000~K000: B
- K000~O000: done
- O000~R000: B
- R000~S000: done
- S000~W000: B
- W000~Y000: B
- Y000~00000: B
- 00000~10000: A
- 10000~20000: A
- 20000~30000: A
- 30000~40000: A
- 40000~50000: A
- 50000~60000: A
- 60000~70000: A
- 70000~80000: A
- 80000~90000: pending
- 90000~a0000: pending
- a0000~b0000: pending
- b0000~c0000: pending
- c0000~d0000: pending
- d0000~e0000: pending
- e0000~f0000: pending
- f0000~g0000: pending
- ZZZZ~ZZZZZZ: pending
- fb/0~a00: done
- fb/a00~1000: done
- fb/1000~2000: done
- fb/2000~6000: B
- fb/6000~a000: pending
- fb/a000~b000: done
- fb/b000~c000: done
- fb/c000~d000: done
- fb/d000~e000: done
- fb/e000~i000: B
- fb/i000~j000: pending
- fb/j000~k000: done
- fb/k000~l000: pending
- fb/l000~n000: pending
- fb/n000~o000: pending
- fb/o000~p000: done
- fb/p000~q000: pending
- fb/q000~r000: pending
- fb/r000~s000: pending
- fb/s000~t000: pending
- fb/t000~u000: pending
- fb/u000~v000: pending
- fb/v000~x000: B
- fb/x000~y000: pending
- fb/y000~z000: pending
- fb/z000~A000: pending
- fb/A000~B000: pending
- fb/B000~C000: pending
- fb/C000~D000: done
- fb/D000~ZZZZZZ: pending

## Schema

- table: mapping
  - slug: the “foo” in “goo.gl/foo”
  - value: either the URL which the slug expands to, or NULL for slugs that expand to nothing
- table: errors
  - slug: the “foo” in “goo.gl/foo”
  - status: the status that goo.gl returned when last tried
  - message: the statusText of the response
