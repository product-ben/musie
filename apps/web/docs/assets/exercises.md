# Exercise card images

One image per exercise, **16:9**. The file is named after the **exercise id**
(the primary key in `public.exercises`), so the wiring is a lookup rather
than a decision.

| file | exercise | sort |
|---|---|---|
| `mindfulness-cards.webp` | Achtsame Pause | 1 |
| `free-rein.webp` | Freie Bahn | 2 |
| `breathing-score.webp` | Atementspannung | 3 |
| `sound-journey.webp` | Klangreise | 4 |
| `body-scan-soundwalk.webp` | Bodyscan | 5 |
| `kalimba.webp` | Kalimba | 6 |
| `marimba.webp` | Marimba | 7 |
| `harp.webp` | Harfe | 8 |

## Where it is drawn, and at what size

Every one of these slots is 16:9 (Ben, 2026-11-18: *"Wir haben ab jetzt nur
noch 16:9 imagery"*):

| where | slot |
|---|---|
| `/exercises`, the deck | the card face's picture band (`.musie-exercise-card__image`) |
| `/exercises`, the list | `RadioCards` thumbnail: 96 × 54 below a 480px group, 192 × 108 above it (`musy-components.css` §13) |
| Einsteigen | `.musie-intro__image`, beside the headline; on a tablet as tall as the copy, capped at 30% of the row |
| `/diary`, the graph | one mark per session, 44 × 25 at 393px (`.musie-graph__mark`) |

The crop is `object-fit: cover` everywhere, and with a 16:9 source it crops
next to nothing. **Draw the subject roughly centred anyway.** On a tablet,
Einsteigen caps the picture at 30% of the row, so a tall block of copy can
make the slot narrower than 16:9, and then `cover` trims the sides.
(Bodyscan's head sits at the right edge of its frame and is the first thing
that would go.)

## The shipped file: native size WebP, quality 80

The 2026-11-18 masters are 1376 × 768 PNGs, 1.5–2 MB each, 13.5 MB for the
eight. They ship **at their own size**, re-encoded only:

```js
sharp(src).webp({ quality: 80, effort: 6 })
```

648 KB for the set, 45–153 KB each. The old square set was 748 KB for five.
Scaling down to 1024 wide would save another ~280 KB, but it loses the
engraving's hairlines on a retina screen, and that linework is what the style
is.

Keep each file under ~200 KB. All eight load together on `/exercises`, and it
is a phone-first screen.

`sharp` is a transitive dependency, so this is a throwaway script rather than a
committed one. Resolve it from `node_modules/.pnpm/sharp@*/node_modules/sharp`
with `createRequire`.

The masters live **outside the repo**, in
`~/Documents/musie-assets/app graphics/exercises/` on Ben's machine. Everything
under `public/` is copied into the build verbatim, so a 2 MB source kept here
would ship to every visitor without ever being requested.

### Replacing a picture

Overwrite the `.webp` **under the same name**. `image_url` already points at
it, so no migration is needed for the path. Cloudflare serves `public/` with
revalidation (there is no `_headers` file), so a returning visitor gets the
new file on their next load, not a cached old one.

**Then rewrite its `image_alt`, both locales, in a new migration.** A
description belongs to a picture, and a new picture makes the old one wrong.
`20261118100000_exercise_artwork_16x9.sql` is the worked example.

## Wiring a new one up

The path is a column, not a convention, so dropping a new file here shows
nothing until `public.exercises.image_url` says so. That takes a new, stacking
migration (CLAUDE.md rule 4). `20260924140000_exercise_artwork.sql` is the
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
