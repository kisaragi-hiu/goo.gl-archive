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
- 00000~30000: done
- 30000~70000: done
- 70000~80000: A
  - done: 70000~74vDB, 7L000~7OMGk, 7j000~7mLTB
- 80000~B0000: A
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
- a0000~b0000: done
- b0000~c0000: B
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
