# Reflexion 01 — feedback, November 2026

What participants of [„Reflexion 01“](reflexion-01.md) reported, collected
on 2026-11-20 from three sources:

- **Messages to Ben**, by text, after the run.
- **The feedback survey's open answers** („Was würdest du dir anders
  wünschen?“, „Was fandest du am besten?“), PostHog event `survey sent`.
- **The reflections**, `experiment_responses`, where an answer reports a
  problem rather than an experience.

The period is 19–20 November: 39 reflections and 34 survey submissions, not
counting test runs. Quotes are verbatim. **Nobody is named here, because this
repository is public.** The names are in `experiment_responses_wide` and on
the PostHog dashboard.

The experiment mounts the app's `routes/Session.tsx` and the app's harp
unmodified (`reflexion-01.md`, „How it is built“). So items 1, 2 and 4
below are **the app's problems as well**: a fix made in the app reaches both,
and a fix made only in the experiment leaves the app as it is. Item 3 is the
experiment's own reflect step.

## Problems

### 1 · A swipe back leaves the page, mid-exercise — Harfe

Reported by two participants, one by message and one in the reflection and
the survey:

> „probleme beim spielen der tiefsten seite, weil beim switchen von oder nach
> ganz links das betriebssystem immer eine andere app in den vordergrund
> geschoben hat. dadurch bin ich etwas aggressov geworden“

> „die linkeste saite der harfe könnte weiter weg vom linken rand des
> bildschirms angebracht werden, damit man beim spielen keine versehentlichen
> befehle an sein gerät gibt.“

**What happens, probably.** Not reproduced. On Android with gesture
navigation, a swipe in from the left edge is „back“. The lowest string sits at
that edge, so playing it sends back. The links are opened from a message, so
the tab has no history of its own, and back leaves the browser for the app
the link came from: „eine andere App in den Vordergrund“. Safari on iOS has
an edge swipe too, which goes back within the tab. Nothing in the app or the
experiment holds the page:
there is no `popstate`, `pushState` or `beforeunload` anywhere in `src/`.

**Ways out, not decided:**

| | Up | Down |
|---|---|---|
| Keep the strings clear of both edges, as the participant suggests | Only layout, and it removes the cause | The width of Android's back zone is a user setting, so no margin is certain |
| A history entry when the exercise starts, and a `popstate` that stays on the page | Catches back from any source, on both systems | Changes how back behaves in the app's session; Chrome skips entries made without a tap, so the entry has to come from one |
| `beforeunload` | One line | Phones mostly do not show it for back, so it rarely helps |

A related report from Freie Bahn, not understood yet: „Bin beim ersten Mal
raus geflogen, nachdem ich das Bild im Vollbildmodus mit dem x wieder kleiner
klicken wollte.“

### 2 · The screen dims after about 50 seconds — Freie Bahn, by message

On a Google Pixel, the screen dims while the participant looks at the
picture, because nothing touches the screen. The picture can then no longer
be seen. That defeats Freie Bahn, which is looking. A Body Scan with closed
eyes does not mind, and the harp is touched all the time.

**Cause.** No Screen Wake Lock (`navigator.wakeLock`) in the app or the
experiment. The phone's own screen timeout applies.

**The usual fix** is to request a wake lock while the exercise step runs,
request it again when the page becomes visible, and release it when the step
ends. Chrome on Android and Safari on iOS (16.4 and later) support it. It
costs battery only while it is held.

### 3 · The feelings button is not found — reflect step, by message

A participant did not find „Stimmung benennen“, the small button inside the
field of „Beschreibe, wie sich deine Stimmung verändert hat“. PostHog agrees:
on 19–20 November, `exp_feelings_help_opened` came from **2 people**, and
`exp_completed` from 18. The field only shows after „Ja“, which most
participants answered, so most of the 18 had the button in front of them.

The button sits inside the field at the bottom end (`ReflectionStep.tsx`,
Figma node 190:15804). Moving it out of the field, or making it bigger, are
the obvious tries. Neither is decided.

### 4 · The harp crackles on a Google Pixel — reflection

> „manche Töne haben zumindest auf meinem Google Pixel etwas gescheppert“

Not reproduced. One device, one report.

### 5 · The picture is small on a phone — Freie Bahn, survey

> „Ansicht auf dem Smartphone verbessern, sodass das Bild größer zu sehen
> ist. Aber top, dass es vorher den Hinweis gibt, dass ein größerer
> Bildschirm besser wäre!“

PR #91 (Freie Bahn's card goes full screen on a phone turned sideways) is
open and addresses this.

## Wishes

**Body Scan: longer.** The most frequent wish, from five participants:
„Gerne noch länger“, „Länger machen“, „Ein längerer Body scan Bauch/Rücken“,
„Für mich hätte der Body Scan deutlich länger sein können! Eventuell kann man
verschiedene Längen anbieten“, „Vielleicht bietet man eine kurze und eine
lange Version an“. One noticed that it starts at the hands rather than going
from head to feet, as in yoga.

**Body Scan: the voice.** Split. Praised as „ruhige, klare Stimme“ and „Stimme
ist neutraler“. Criticised as too fast („Die Sprachgeschwindigkeit war mir zu
schnell“, „Langsameres sprechen“) and as having „einen esoterischen touch.
Mir ist eine neutrale Stimme/Wortwahl lieber“. One was annoyed at first and
then came down.

**Harfe: the duet.** „Das bei Duett der Pertner nicht aufhört sondern
weiterspielt, bis man wieder selbst spielt.“ and „beim zusammenspiel könnte
die App/KI von sich aus mehr die Saiten spielen“. One person who disliked
the exercise (NPS 0) wanted the opposite of playing: „Wenn ich einfach eine
vorgegebene Melodie abspielen könnte ohne proaktiv etwas machen zu müssen,
wäre es besser.“

**Harfe: more of it.** A minute longer by default, so that one arrives
before the countdown starts; a short guide to playing; more tones to choose
from.

**Fewer questions afterwards.** Two participants: „Weniger fragen danach“,
„Weniger Fragen“.

**Freie Bahn.** A moving picture to go with the piano. One was confused that
the picture „zwei Perspektiven hatte“.

## What people liked

- **Harfe:** swiping over the strings; that a harder touch plays louder; that
  the duet answers („bei einem Ton folgte nur ein Ton, bei mehreren folgte eine
  Melodie“); the repeating tone sequence („man irgendwie darauf vertrauen konnte,
  es kommt nicht plötzlich etwas ganz anderes“); that it is intuitive.
- **Body Scan:** handing over for a few minutes („kurz Verantwortung abgeben
  und sich leiten lassen“); the mix of voice and music, „da die Musik immer
  wieder meine Aufmerksamkeit zurückholte“; the chimes.
- **Freie Bahn:** the picture and the music together („ohne Bild fällt es mir
  schwer mit den den Gedanken bei mir zu bleiben“); the timer as a frame for
  focus.

## Reading it again

- **Reflections:** `select * from experiment_responses_wide where not
  is_internal order by created_at` — or, from the main checkout,
  `supabase db query --linked "<that query>"`, which uses the CLI's own
  login and needs no key. Two test runs on 19 November are not marked
  `is_internal` („Ben“, „Ben Test final?“).
- **Survey:** in PostHog, event `survey sent` with `$survey_id`
  `01a1e3ac-14f6-0000-babb-e48bb67229f0`; each answer is the property
  `$survey_response_<question id>`, the IDs in `SURVEY` in `config.ts`.
