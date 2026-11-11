# body.bin — where the body comes from

The 3D body in `/experiments/body-side/` and `/experiments/body-resonance/` (from
version 261111-1143 on). Ben, 2026-11-11.

- **Shape and topology:** Anny, NAVER Corporation —
  <https://github.com/naver/anny>, file `src/anny/data/topology/notoes.obj`.
  Anny's code is Apache 2.0.
- **The body it is built on:** MakeHuman / MPFB2 assets, CC0 1.0
  (`src/anny/data/mpfb2/LICENSE.md` in the same repository). `notoes.obj` is
  Anny's MakeHuman-derived full-body mesh in its neutral shape, without helper
  geometry.
- **No code from that repository runs here.** Only the mesh file was read.

## The conversion

`notoes.obj` (12,272 vertices, 12,250 quads and 40 triangles) is written as a
small binary, quads split into two triangles:

```
"MUSB"            4 bytes
vertex count      uint32, little endian
triangle count    uint32, little endian
positions         float32 x, y, z per vertex (metres; y up, facing +z, the body's left is +x)
indices           uint16 a, b, c per triangle
```

12,272 vertices, 24,540 triangles, 294,516 bytes. The experiments compute the
normals in the browser.
