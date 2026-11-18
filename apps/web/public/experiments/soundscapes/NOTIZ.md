# Notiz · Soundscapes

> **⚠ Für Ben:** Ab v4 ist das Monochord **CC BY 4.0** (Jagadamba). Die Namensnennung in der App ist Pflicht,
> der genaue Wortlaut steht oben in `AUDIO_LICENSES.md`. Alles andere ist CC0.

## v4 (`261110-2115/`): echte Instrumente, Rhythmus, richtige Entfernung

Lucias Kritik an v3: kaum Unterschied zwischen still und bewegt; fern ist nicht unbedingt dumpf; die Instrumente
klingen nicht schön und nicht echt; Ambient ist etwas anderes. Neuer Wunsch: ein entspannter Beat mit BPM.

- **still ↔ bewegt:** Jede Ort-Variante ist jetzt ein Paar aus einer ruhigen und einer lebhaften Aufnahme desselben
  Ortes (z. B. leise Tropfen → starker Regen, kleine Flamme → prasselndes Feuer, Vögel → Wind in den Bäumen). Der Regler
  blendet zwischen beiden über. Auch bei „bewegt“ bleibt ein Rest der ruhigen, damit der Ort erkennbar bleibt.
- **nah ↔ fern** nach der Hörforschung zur Entfernung (Pegel und das Verhältnis von direktem zu diffusem Klang sind die
  Hauptmerkmale; Höhenverlust erst ab etwa 15 m und nur leicht): fern = leiser, Anschläge weicher (Parallel-Kompression),
  schmaleres Stereobild, Höhen −5 dB ab 5 kHz. Nah = breiter, Details klar, Höhen +1,5 dB. Kein Hall.
- **Klänge = echte Aufnahmen:** Klangschalen (3 angeschlagen, 1 gerieben), Shruti-Box, Tanpura, Monochord (CC BY!),
  5 Ambient-Flächen (Ambient = langsam wandernde Klangflächen, nicht einzelne Töne). Die Seite misst jede Aufnahme nach dem
  Laden (Spektrum) und stimmt sie auf D: Bordun-Grundton → D; Schalen/Monochord → nächster Ton von D-E-F♯-A-H
  (höchstens ±1,5 Halbtöne). Ambient-Flächen fest nach der Tonart im Titel.
- **Rhythmus** (dritte Reihe, bis zu 3 Schichten): Cajon, Rahmentrommel, Shaker und Trommel. Echte Einzelschläge (VCSL, CC0),
  16tel leicht verschleppt, Zeit und Stärke leicht unregelmäßig, Zwischenschläge nur mit Wahrscheinlichkeit, zwei
  Aufnahmen je Schlag im Wechsel, damit es nicht maschinenhaft klingt. Tempo 60–90 BPM, eigene Lautstärke.
  (Der ursprüngliche Auftrag sagte „kein Rhythmus/Beat“; Lucia hat das am 2026-11-10 selbst als dritte Option gewünscht.)
- Die Stimmung ist mit Testtönen geprüft (auf 1/100 Halbton genau). Wie sie an den echten Aufnahmen trifft, muss man hören.

## v3 (`261110-2110/`): nur echte Aufnahmen

Lucia nach v2: Das tiefe Füllrauschen soll ganz weg, es sollen „nur natürliche Aufnahmen von natürlichen
Soundscapes“ sein, „nichts dazu“. Die Aufnahmen sucht Claude selbst aus (lizenzfrei, hohe Qualität), mehrere
Varianten pro Ort, Lucia wählt per Schalter.

- **Orte = Aufnahmen**, je drei Varianten pro Ort, alle CC0, alle in `AUDIO_LICENSES.md`. Nichts Erzeugtes darunter.
- **Keine hörbare Schleife:** Abschnitte von 16–40 s ab zufälliger Stelle, 4 s weich überblendet.
- **still ↔ bewegt** legt dieselbe Aufnahme ein- oder zweimal versetzt darüber: mehr Tropfen, mehr Wellen, dichteres
  Knistern, aber nicht lauter. **nah ↔ fern** macht nur dumpfer und leiser, ohne Hall.
- Alle Aufnahmen werden auf die gleiche mittlere Lautheit gebracht, damit ein Wechsel nicht plötzlich lauter ist.
- **Klänge** bleiben erzeugt (wie v2).
- **Bild:** wie v2. Wellen, Böen und Funken löst jetzt das Bild selbst aus, nicht mehr der Klang.
- **Öffnen:** nur über den Server (`pnpm --filter web dev --host`), nicht per Doppelklick, weil der Browser
  per Doppelklick keine Audiodateien laden darf.
- **Gewitter:** Keine Aufnahme hat laut Beschreibung Donner. „Rain Ambience“ (regen-3) ist aber mit
  „storm, downpour“ verschlagwortet. Falls darin doch Donner ist: Der Begrenzer fängt Spitzen ab, ein fester
  Donner-Deckel wie in v1/v2 ist mit Aufnahmen aber nicht möglich. Dann diese Variante tauschen.
- **Für die echte App:** die Original-WAVs (mit Freesound-Konto) laden und selbst in Web-Formate wandeln. Die
  HQ-Vorschauen sind für den Prototyp gut, aber schon einmal verlustbehaftet komprimiert.

## v2 (`261110-2022/`): nach Lucias erstem Höreindruck

Rückmeldung zu v1: „klingt eher nach Weltraum als nach den Orten“, „alle gleich“, „viel Schwarz“.

- **Ursache Klang:** zu viel Hall; Orte aus gestimmten, gleitenden Filtern (pfeift und blubbert); alle Orte
  auf derselben Rauschfläche.
- **v2 Klang:** Orte ungestimmt, jeder mit eigener Bauweise: Regen aus vielen winzigen Tropfen plus ein paar nahen,
  Bach aus Bläschen (kurze Sinus-Zirpen, die nach oben rutschen), Wald aus Wind, Blätter-Körnern und selten
  einem fernen Vogelruf, Strand aus Brechen, Schaum-Zischen und Rücklauf, Kamin aus Flackern, Knacken und
  ab und zu einem Holzscheit. Hall bei den Orten nur noch für „fern“, bei den Klängen etwa halbiert.
- **Ursache Bild:** dunkler Modus, fast schwarze Fläche, sehr zarte Linien.
- **v2 Bild:** jeder Ort hat eigene Farbflächen aus der Palette, im dunklen Modus aus den helleren Stufen.
  Gefüllte, größere Formen mit mehr Bewegung (Wellenbänder und Schaum, Stämme mit Lichtflecken und fallenden
  Blättern, Wolken, Regenstreifen und Pfützenringe, fließende Bänder mit Glitzern, Flammen und Funken).
  Die Bildunterschrift steht auf einer eigenen Karte.
- Der Grundton gilt jetzt nur für die Klänge. Die Orte haben keine Tonhöhe mehr, also reibt sich nichts.
- Weiter gilt: Echte Aufnahmen (nach Freigabe aus `KANDIDATEN.md`) werden natürlicher klingen als jede Synthese.

## v1 (`261110-2001/`)

Ein Prototyp zum Anschauen und Anhören. Eine einzige Datei, alles synthetisch, kein PostHog, nichts geht
an Supabase. Gespeichert wird nur die eigene Auswahl im Browser.

## Was gut funktioniert (soweit ohne Hören prüfbar)

- **Jede Kombination klingt stimmig.** Alle Klänge stehen auf D-Pentatonik (D E F♯ A H). Die
  tonhaften Teile der Orte stehen auch darauf: Der Wind im Wald zieht auf A, D, E, F♯, und das
  Gluckern im Bach springt nur zwischen Tönen dieser Tonleiter.
- **Keine Schleife, kein Takt.** Wellen, Böen, Tropfen, Knistern und Anschläge kommen in zufälligen
  Abständen. Die Rauschflächen sind zwei verschieden lange Schleifen, links und rechts, nahtlos überblendet.
- **Sicherheit:** Am Ende sitzen ein Kompressor und ein Begrenzer. Jede Regleränderung wird weich
  eingeblendet. Beim Start wird über 4 s eingeblendet, am Timer-Ende über 45 s ausgeblendet (der Ausklang
  endet zur eingestellten Zeit). Neue Schichten blenden ein, abgewählte aus.
- **Donner** nur bei „Regen“ ganz oben auf „bewegt“: höchstens alle 25 s, stark tiefgefiltert, mit festem
  Deckel. Mit „bewegt“ wird der Regen dichter, aber nicht lauter: Jeder Tropfen wird leiser, je mehr es sind.
- **„nah ↔ fern“** dreht nicht nur die Lautstärke herunter. Fern heißt: die Höhen gehen weg und der Hall
  wird mehr.
- **Mobil zuerst:** Chips 44 px hoch, Regler mit 44 px Griffhöhe, keine Gesten. Dunkler Modus über das System,
  Farben und Schriften aus dem Design-System. Bei „Bewegung reduzieren“ steht das Bild still.
- **Der Probelauf** gegen ein nachgebautes Audio-System klickt jeden Ort und jeden Klang durch, jeden
  Regler von 0 bis 100, den Timer bis zum Ende und alles Abwählen. Er lief ohne Fehler.

## Was ich nicht prüfen konnte

- **Wie es wirklich klingt.** Den echten Browser konnte ich hier nicht starten. Die Lautstärken der
  Orte und Klänge zueinander sind geschätzt. Wahrscheinlich ist ein Ort zu leise oder ein Klang zu
  laut. Das sind einzelne Zahlen in der Datei und schnell angepasst.
- Ob das Handy im Sperrbildschirm weiterspielt. iPhones halten Web-Audio im Hintergrund oft an.

## Was für eine echte Integration in die Musi-App fehlen würde

1. **Bausteine aus dem Design-System statt Nachbau:** `FilterChips` für die Auswahl, ein Regler-Baustein
   (gibt es im System nicht, wäre also eine Komponenten-Anfrage) und `MusicPlayer` oder `Countdown` für
   Timer und Play.
2. **Texte in den Katalog** (`apps/web/src/i18n/en.ts` und `de.ts`), auf Englisch und Deutsch. Hier steht alles direkt in der Seite.
3. **Echte Aufnahmen** nach Freigabe (`KANDIDATEN.md` → `AUDIO_LICENSES.md`), mit Mischung aus Aufnahme und
   Synthese: Aufnahme als Grundfläche, Synthese für Variation und Intensität.
4. **Hintergrund-Wiedergabe:** Media Session (Steuerung auf dem Sperrbildschirm) und eventuell ein
   `<audio>`-Element als Träger, damit iOS nicht abschaltet.
5. **Lautstärke-Abgleich** nach Messung (LUFS) je Ort und Klang statt geschätzter Zahlen.
6. **Barrierefreiheit prüfen** mit VoiceOver und TalkBack. Die Chips sind Umschalt-Knöpfe mit Zustand,
   die Szene ist für Screenreader ausgeblendet, und die Bildunterschrift wird angesagt.
7. **Datenschutz und Messung** wie bei den anderen Experimenten (Regel 10), falls man es messen will.

## So probierst du es aus

- **Am Mac:** die Datei `261110-2001/index.html` im Browser öffnen (Doppelklick im Finder).
- **Am Handy:** `pnpm --filter web dev --host` starten und am Handy (im selben WLAN) die angezeigte
  Netzwerk-Adresse öffnen, mit `/experiments/soundscapes/261110-2001/` dahinter.
