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
- 0000~S000: done
- S000~W000: B
- W000~Y000: done
- Y000~a000: done
- a000~f000: done
- f000~g000: done
- g000~h000: done
- h000~k000: B
- k000~l000: done
- l000~p000: B
- p000~q000: done
- q000~s000: B
- s000~v000: B
- v000~x000: done
- x000~z000: done
- z000~00000: done
- 00000~20000: A
  - done: 00000~06ItV, 0W000~0ZL3E, 10000~16JUl, 1W000~1ZLEi, 20000~26K6k, 2W000~2ZLIR, 30000~36Jxl, 3W000~3ZLHS, 40000~46Jwy, 4W000~4ZFZC, 50000~56K0n, 5W000~5ZFVh, 60000~64vDj, 6L000~6OMTT, 6j000~6mLeQ, 70000~74vDB, 7L000~7OMGk, 7j000~7mLTB
- 20000~80000: pending
- 80000~90000: pending
- 90000~A0000: pending
- A0000~B0000: pending
- B0000~C0000: pending
- C0000~D0000: pending
- D0000~E0000: pending
- E0000~F0000: pending
- F0000~G0000: pending
- G0000~H0000: pending
- H0000~I0000: pending
- I0000~J0000: pending
- J0000~K0000: pending
- K0000~L0000: pending
- L0000~M0000: pending
- M0000~N0000: pending
- N0000~O0000: pending
- O0000~P0000: pending
- P0000~Q0000: pending
- Q0000~R0000: pending
- R0000~S0000: pending
- S0000~T0000: pending
- T0000~U0000: pending
- U0000~V0000: pending
- V0000~W0000: pending
- W0000~X0000: pending
- X0000~Y0000: pending
- Y0000~Z0000: pending
- Z0000~a0000: pending
- a0000~b0000: B
- b0000~c0000: pending
- c0000~d0000: pending
- d0000~e0000: pending
- e0000~f0000: pending
- f0000~g0000: pending
- g0000~h0000: pending
- h0000~i0000: pending
- i0000~j0000: pending
- j0000~k0000: pending
- k0000~l0000: pending
- l0000~m0000: pending
- m0000~n0000: pending
- n0000~o0000: pending
- o0000~p0000: pending
- p0000~q0000: pending
- q0000~r0000: pending
- r0000~s0000: pending
- s0000~t0000: pending
- t0000~u0000: pending
- u0000~v0000: pending
- v0000~w0000: pending
- w0000~x0000: pending
- x0000~y0000: pending
- y0000~z0000: pending
- z0000~zzzzz: pending
- zzzzz~zzzzzz: pending
- fb/0~6000: done
- fb/6000~A000: A
- fb/A000~C000: done
- fb/C000~D000: done
- fb/D000~K000: B
- fb/K000~T000: B
- fb/T000~a000: B
- fb/a000~i000: done
- fb/i000~o000: A
- fb/o000~p000: done
- fb/p000~t000: A
- fb/t000~v000: B
- fb/v000~x000: done
- fb/x000~z000: B
- fb/z000~00000: pending
- fb/00000~zzzzzz: pending

## Schema

- table: mapping
  - slug: the “foo” in “goo.gl/foo”
  - value: either the URL which the slug expands to, or NULL for slugs that expand to nothing
- table: errors
  - slug: the “foo” in “goo.gl/foo”
  - status: the status that goo.gl returned when last tried
  - message: the statusText of the response
