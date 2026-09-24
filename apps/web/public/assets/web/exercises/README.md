# Exercise card images

One image per exercise, drawn by `RadioCards` on `/exercises`. The file is
named after the **exercise id** — the primary key in `public.exercises` — so
the wiring is a lookup rather than a decision.

| file | exercise | sort |
|---|---|---|
| `mindfulness-cards.webp` | Achtsame Pause | 1 |
| `free-rein.webp` | Freie Bahn | 2 |
| `breathing-score.webp` | Achtsam Atmen | 3 |
| `sound-journey.webp` | Klangreise | 4 |
| `body-scan-soundwalk.webp` | Bodyscan | 5 |

## The shipped file: 768 × 768 WebP, quality 80

`.musy-rcard__media` is **64px** wide below the group's 480px container
breakpoint and **192px** above it (`--target-guided` and `calc(… * 3)`,
`musy-components.css` §7.8). 768 is 4× the largest slot the card ever gives an
image — past any display anyone is holding, retina margin intact.

The crop is `object-fit: cover` at both sizes, so the source is **square** and
the subject **centred**. There is no art-direction hook: the same file is
cropped to a 1:1 thumbnail on a phone and to a tall 192px column on a desktop.

Keep each file under ~200 KB. All five load together, and this is a
phone-first screen.

### Re-encoding a new source

The 2026-09-24 originals were 1254 × 1254 PNGs at ~3.3 MB each — ~17 MB for
one screen. They were re-encoded with `sharp` (a transitive dep, so this is a
throwaway script rather than a committed one):

```js
sharp(src).resize(768, 768, { fit: 'cover' }).webp({ quality: 80, effort: 6 })
```

748 KB for the set. The masters live **outside the repo**, in
`~/Documents/musie-artwork/exercises/` on Ben's machine — everything under
`public/` is copied into the build verbatim, so a 3 MB source kept here ships
to every visitor without ever being requested.

## Wiring one up

The path is a column, not a convention, so dropping a file here shows nothing
until `public.exercises.image_url` says so. That takes a new, stacking
migration (CLAUDE.md rule 4) — `20260924140000_exercise_artwork.sql` is the
worked example:

```sql
update public.exercises set image_url = 'assets/web/exercises/free-rein.webp'
  where id = 'free-rein';
```

Then `supabase db reset` and `pnpm test:db`.

`exercise_i18n.image_alt` is a separate column, **per locale, and not
optional**: `RadioCards` puts the image inside the radio's own label, so the
alt text is part of what the card announces when somebody chooses it with a
screen reader. Both locales, German to `docs/GERMAN-UI-WRITING.md`.
