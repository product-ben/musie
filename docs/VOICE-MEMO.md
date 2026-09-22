# The voice memo — a design, not yet a build

**Status: proposed, 2026-09-22. Nothing in this document is implemented.**
Ben asked for the design before the code; this is it. Every section says where
it lands when it is approved, so approval is an edit list rather than a second
design session.

The feature in one sentence: **on the reflect step, a switch — off by default —
that also keeps the recording of a spoken answer, for thirty days.**

It is small on screen and large underneath, because it reverses the decision
that shaped the reflections table.

---

## 1 · What this reverses, and how honestly

[DOMAIN-MODEL.md](../DOMAIN-MODEL.md) **D1** is not a gap. It is an answered
question, and it is answered in three places that all have to move together:

| Where | What it says today |
|---|---|
| D1 | *"No `media_path`, no Storage bucket, no retention policy."* |
| `20260919120000_sessions.sql` | *"The column is absent rather than nullable on purpose: a nullable `media_path` is an invitation to start writing to it."* |
| `i18n/en.ts` · `privacy.voice` | *"The recording itself is never stored."* |

The third is the one that matters most, because it is a promise made to a
person rather than a note made to a developer. **An opt-in switch does not
preserve that promise; it makes it conditional.** That is a defensible product
position — your voice, your choice — but it is a different position, and the
privacy page has to say so plainly rather than keep the old sentence and hope
the switch covers it.

So this is not an additive feature. It is **D16, superseding D1**, and the
first thing to land is the decision entry, not the column.

### D16 · Is a recording ever kept? — ONLY IF ASKED, AND ONLY FOR THIRTY DAYS

> Ready to paste into DOMAIN-MODEL.md's decision list on approval.

The transcript is still the reflection. A recording is an **attachment to it**,
never a substitute: `reflections.body` stays `not null`, a memo without a
transcript cannot exist, and the diary entry reads the same whether a memo is
there or not.

It is kept only when the person turns it on, before the microphone opens, on
that recording. It expires thirty days later and is deleted by a sweep that
does not depend on anyone opening the app.

This supersedes D1's *"only text is ever stored"*. What survives of D1 is the
part that was doing the real work: **text is the record.** Audio is a
short-lived extra that the diary can lose without losing the entry.

---

## 2 · The one number that needs your signature

**Thirty days.** It is a recommendation, not a derivation, and it is the only
figure here I would want you to say yes to explicitly.

The argument: a memo is for hearing *how* you said something — the pause, the
tone, the thing the transcript flattened into a sentence. That is worth having
in the weeks after a session. A year later, the transcript is what you want,
and a year-old recording of your own voice in a bucket is a liability with no
reader. Thirty days also bounds the orphan problem in §7 to a month rather
than forever.

Ninety is the obvious alternative and costs nothing to choose instead — it is
one constant. Pick before the migration is written, because changing it later
changes rows that already exist.

---

## 3 · The copy, written rather than flagged

CLAUDE.md rule 6: a missing German string is written to the standard in
[GERMAN-UI-WRITING.md](GERMAN-UI-WRITING.md), not left as a placeholder. All of
it is du, lower case, sentence case, no *Bitte*.

### The promise, rewritten

`privacy.voice` — replaced, both locales:

- **en** · `'If you answer out loud, Musie turns your words into text. The recording is kept only if you switch that on before you speak, and then for thirty days. After that Musie deletes it.'`
- **de** · `'Wenn du laut antwortest, macht Musie aus deinen Worten Text. Die Aufnahme behält Musie nur, wenn du das vor dem Sprechen einschaltest — und dann dreißig Tage lang. Danach löscht Musie sie.'`

### The switch

- `reflect.voice.keep` — **en** `'Also keep my voice memo'` · **de** `'Sprachaufnahme behalten'`

  *Sprachaufnahme*, not *Aufnahme*: this app already calls the music a
  recording, and two things called *Aufnahme* on adjacent steps is the kind of
  collision the length budget tempts you into.

- `reflect.voice.keepNote` — the sentence under it.
  **en** `'Only this recording, and only for thirty days. Your written answer stays either way.'`
  **de** `'Nur diese Aufnahme, und nur dreißig Tage lang. Deine Antwort als Text bleibt so oder so.'`

- `reflect.voice.keepLocked` — why it cannot be changed mid-recording.
  **en** `'You can change this before you start recording.'`
  **de** `'Das kannst du ändern, bevor du aufnimmst.'`

- `diary.memo.label` — the player's label.
  **en** `'Your voice memo'` · **de** `'Deine Sprachaufnahme'`

- `diary.memo.expires` — **en** `'Musie deletes this recording on {date}.'` · **de** `'Musie löscht diese Aufnahme am {date}.'`

- `diary.memo.gone` — for an entry whose memo has expired but whose transcript
  is still there. **en** `'The recording for this entry has been deleted. Your answer is still here.'` · **de** `'Die Aufnahme zu diesem Eintrag ist gelöscht. Deine Antwort ist noch da.'`

`de.ts` is typed against `en.ts`, so any key added on one side without the
other fails `pnpm check` — which is the enforcement, and the reason this list
is complete rather than indicative.

---

## 4 · The switch, and the one rule it must obey

It renders in `VoiceTranscript.tsx`, **above `RecordButton`**, as the design
system's `Switch` — which exists, is exported, and takes an `onGlyph`/`offGlyph`
pair. `Mic` / `MicOff` is the domain pair here, so the knob says *what* is
switching rather than only *that* something is.

`Switch` has no `description` prop, so `reflect.voice.keepNote` goes in the
`<p className="musie-note">` beside it — the pattern this file already uses
twice.

**The rule: the switch is read before the microphone opens, and locked while it
is running.**

This is not a nicety. You cannot offer opting in *after* the fact unless you
buffer every session's audio on the chance it is wanted — and buffering
regardless is precisely what the promise forbids, switch or no switch. So:

```
disabled={running || awaitingToken}
```

with `reflect.voice.keepLocked` shown in place of the note while it is locked.
Opting *out* mid-recording could be honoured by discarding the buffer, and is
deliberately not: one rule in both directions is the one a person can predict.

**`begin()` reads it once**, at the top, and passes it down. The value at the
moment the microphone opened is the value that governs that recording — not a
ref that a re-render could move underneath the buffer.

### More than one recording per reflection

`begin()` passes `keepExisting: true` — *Record more* adds to the transcript,
so a reflection can be several runs. `reflections` is `unique (session_id)`,
one row, so a memo cannot be one file per run without a child table.

**Concatenate.** Every run is the same format at the same sample rate, so
joining is appending sample data and rewriting one header. One reflection, one
memo, one row, no new table.

The consequence to accept: a run recorded with the switch off, followed by one
with it on, produces a memo of the second only — and the transcript still holds
both. Say it in the note or accept it as obvious; I lean to accepting it.

---

## 5 · Where the audio comes from

There is no audio file today. `features/voice/src/audio/recorder.ts` runs an
AudioWorklet that emits base64 PCM16 every ~40 ms straight to the socket and
keeps nothing.

**Accumulate the PCM that already flows, and encode WAV in the browser.** No
new dependency, no second microphone consumer, no new permission, and it works
exactly wherever transcription already works.

The cost is size. `SAMPLE_RATE` is 24 000, mono PCM16 — 48 KB/s, so the 60 s
`SESSION_SECONDS` ceiling is **~2.9 MB**, uncompressed.

The alternative is a second `MediaRecorder` on the same `MediaStream` for
opus/webm at roughly a tenth of that. It is rejected **for now**, not on
principle: `MediaRecorder` under iOS Safari is the exact surface BUILD-PLAN's
post-F.6 checkpoint says to *"budget a session for surprises"* on, and this
feature should not be the thing that discovers it.

**Revisit it when mobile upload time bites.** 2.9 MB after a reflection on a
train is a slow, visible wait, and it is the most likely first complaint.

Accumulation is bounded by the same 60 s ceiling the recorder already enforces,
so the buffer cannot grow without limit even if a stop path is missed.

---

## 6 · The schema and the bucket

### The column

A new migration — rule 4, migrations stack, never edit an applied one:

```sql
alter table public.reflections
  add column media_path text,
  add column media_expires_at timestamptz;

alter table public.reflections
  add constraint reflections_media_pair
    check ((media_path is null) = (media_expires_at is null));
```

Both or neither, as one check. The same shape as `sessions_ended_at_matches_status`
and for the same reason: a path with no expiry is a recording nobody will
delete, and an expiry with no path is a promise about nothing.

`media_expires_at` is a **stored column, not a computed offset from
`created_at`**. The retention window is a product decision that may change; a
row must keep the promise it was written under rather than silently inherit a
new one.

### The bucket

**This is not greenfield.** `20260921160000_track_audio.sql` already
establishes the pattern, and it should be followed rather than re-argued:
created by migration and not `config.toml` (so `supabase db push` creates it on
the hosted project), `public = false`, a `file_size_limit`, an explicit
`allowed_mime_types`, and policies on `storage.objects` — which is Supabase's
table, so rule 2's revoke-then-grant does **not** apply, as that migration
already explains.

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memos', 'memos', false, 4194304, array['audio/wav'])
on conflict (id) do nothing;
```

4 MiB: comfortably above the 2.9 MB ceiling, far below anything that is not a
memo.

**What is new is that this is the first bucket a client writes to.** `tracks`
has a select policy and nothing else, because uploading there is an operator
act. Here the person is the uploader, so the policies are theirs:

```sql
-- key: {user_id}/{session_id}.wav
create policy memos_objects_select on storage.objects
  for select to authenticated
  using (bucket_id = 'memos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy memos_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'memos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy memos_objects_update on storage.objects
  for update to authenticated
  using (bucket_id = 'memos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy memos_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'memos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
```

`(select auth.uid())` and not bare `auth.uid()`, everywhere — the InitPlan
correction `20260918152000` had to go back and make once already.

**The user id leads the key** rather than the session id alone, so ownership is
readable from the object's own name and no policy needs a join against
`sessions` on every read. Nothing in `{uuid}/{uuid}.wav` names a card or a
feeling, which is the leak `trk-NN` was chosen to prevent.

**`update` is granted, deliberately.** The reflect step can be returned to from
a later step — which is exactly why `saveReflection` is an `upsert` keyed on
`session_id`. The memo needs the same: re-answering replaces the file at the
same key rather than accumulating one per visit.

---

## 7 · Deletion, which is the hard half

Two functions in `apps/web/src/lib/session.ts` currently state the opposite of
what this feature makes true, and both comments have to change with the code:

> *"There is no storage half to this: D1 settled that nothing is ever uploaded,
> so there are no files to orphan."* — `deleteAllSessions`

`reflections.session_id` is `on delete cascade`, so a deleted session takes its
row. **Storage objects do not cascade.** Without new work, every deleted
session leaves a recording of someone's voice in a bucket with its row gone —
the worst possible orphan.

And there is a second orphan this app makes uniquely likely. Accounts are
browser-bound (`privacy.browserBound`: clearing browser data clears the diary,
irrecoverably). Clear the browser and the *transcript* becomes unreachable
while the *audio stays*, owned by an identity nobody can sign in as again.
**No client-side deletion can ever reach those files.** That, more than
anything else here, is why expiry is not optional.

**The deleter is built before the capture.** BUILD-PLAN's F.9 comes before
F.10, which looks inverted and is not: the moment capture ships, files
accumulate that nothing removes. Built the other way round, nothing a person
creates is ever un-deletable — and the sweep is testable with no UI at all,
because the harness can upload its fixtures with the service role.

### Three mechanisms, and they are layered on purpose

1. **The client deletes on the way out.** `deleteSession` removes the object,
   then the row; `deleteAllSessions` lists the caller's own `{user_id}/` prefix
   and removes it in one call before the delete. Fast, and covers the ordinary
   case.
2. **The read refuses anything past its expiry**, whatever is still in the
   bucket. A memo whose `media_expires_at` has passed is not offered, not
   signed and not played — so the promise is true from the moment the
   timestamp passes, not from the moment a sweep happens to run.
3. **A scheduled sweep is the backstop**, and the only one that works for an
   abandoned browser. An Edge Function on a cron, service-role, doing two
   things: delete every object whose row has expired, and delete every object
   with no row at all. The repo already runs Edge Functions (`realtime-token`,
   `reveal-track`), so this is a known shape.

**The sweep must delete through the Storage API, not by deleting rows from
`storage.objects`** — the latter leaves the underlying file behind and is the
classic way to build a bucket that reports empty and costs money.

### Writing order

**Upload first, then write the row.** The two failure modes are not equal: a
file with no row is invisible and swept within the day, while a row pointing at
a file that was never uploaded is a diary entry that is visibly broken. Upload,
then `saveReflection` with the path and the expiry in the same statement that
writes the body.

---

## 8 · Playback, which is already built

`VoiceNote` (§7.19) is in the design system, exported, and **currently unused
by the app**: *"Capture one spoken answer… fully controlled, no media access"*,
with `idle → recording → recorded`, a `Progress`-backed playback position,
play/pause and delete. The app chose `RecordButton` + `DraggableList` for the
reflect step because the transcript is the product — but for the **diary**,
`VoiceNote` in its `recorded` state is the player this feature needs, already
story-covered and already accessible.

So playback is wiring, not a component. It renders in `DiaryEntry`, under the
transcript, with a signed URL minted the way `lib/audio.ts` already mints one
for a track, `diary.memo.expires` beneath it, and `diary.memo.gone` in its
place once the date has passed.

Rule 7 applies with teeth: `VoiceNote` defaults **every** copy prop to the
package's German locale catalogue. All of them get passed.

---

## 9 · What else has to change, by file

Nothing below is optional; each one currently asserts something this feature
makes false.

| File | Change |
|---|---|
| `DOMAIN-MODEL.md` | D16 added; D1 marked superseded, not deleted; the `reflections` table block regains two columns |
| `supabase/migrations/` | one new migration: columns, check, bucket, four policies |
| `lib/session.ts` | `saveReflection` takes path + expiry; `deleteSession` and `deleteAllSessions` lose the "no files to orphan" paragraph and gain the storage half |
| `lib/reflect.ts` | `hasAnswered` is **unchanged** — a memo is never an answer on its own. Worth a comment saying so, since it now looks like an omission |
| `components/VoiceTranscript.tsx` | the switch, the lock, the PCM accumulation, the upload |
| `components/SessionReflect.tsx` | the "voice is not saved" `Message` is deleted by F.6 regardless |
| `routes/DiaryEntry.tsx` | `VoiceNote` playback |
| `i18n/en.ts`, `de.ts` | §3, both locales |
| `MOCKUPS.md` | entry 1 (voice) is retired when F.6 lands; this must not resurrect it |
| `apps/web/OPEN-QUESTIONS.md` | §11 below |
| `BUILD-PLAN.md` | **done** — F.7–F.11, added to Phase F after F.6's checkpoint, plus the Size note and a blocked-table row for §2 |

---

## 10 · How it is verified

`pnpm check` does not touch the database, so it proves none of the below. Rule
4: `pnpm test:db` after any change under `supabase/migrations/`, and
`supabase db reset` first.

**Database (`pnpm test:db`)** — the bucket policies are the new surface and
deserve the same adversarial treatment `db.security.db.test.ts` gives the
tables:

- Alice cannot read, write, or delete an object under Bob's prefix. Four tests,
  one per policy, and each must fail for the right reason.
- `reflections_media_pair` refuses a path with no expiry, and an expiry with no
  path.
- Deleting a session removes the row; the object is **still there** — this test
  asserts the orphan exists, because that is the fact the sweep is built on and
  a test that assumed a cascade would pass for the wrong reason.
- A wav over 4 MiB is refused by the bucket.
- An object of a non-wav mime type is refused.

**Unit** — WAV encoding and concatenation are pure and go in `features/voice/`
beside `segmentation.test.ts`: header correctness, two buffers joined, and the
60 s ceiling holding.

**By hand, on an iPhone**, which is where the checkpoint after F.6 already
points: record with the switch off and confirm no object is created; record
with it on and play it back from the diary; confirm the switch cannot be moved
mid-recording; and watch the upload on mobile data with a stopwatch, because
§5's size question is decided by that number and not by this document.

---

## 11 · For the log, not for me to decide

These go in `apps/web/OPEN-QUESTIONS.md` in that file's format when this is
approved. They are named here so approval covers them.

1. **Thirty days or ninety** — §2. The only number in this document with no
   argument strong enough to settle itself.
2. **Whether the privacy page needs more than a rewritten sentence.** A
   recording of a voice is a different category of personal data from a typed
   sentence, and `privacy.voice` is currently one line among five. It may now
   deserve its own heading. That is a content judgement, not an engineering one.
3. **Whether an expired memo announces itself.** `diary.memo.gone` assumes yes
   — an entry that quietly loses a player looks like a bug. But it also means
   every old entry carries a small notice about something that is gone, forever.
   The alternative is silence and a shorter diary.
4. **Whether the switch should remember.** It is off by default per the brief.
   Whether "off by default" means *every session* or *until you change it once*
   is a real product question, and defaulting to the safer reading — every
   session — is what this design assumes without being told to.
