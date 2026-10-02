# Musie — Briefing für Markt- und Strategiearbeit

**Stand: 28. September 2026.** Dieses Dokument beschreibt Musie als Produkt, für
eine Zusammenarbeit an Marktanalyse, Positionierung, Zielgruppen und
Geschäftsmodell. Es ist kein technisches Dokument: Architektur und Build-Plan
stehen woanders und werden hier nur soweit erwähnt, wie sie eine
Produktentscheidung erklären.

**Eine Konvention vorweg:** Inhalte gelten in diesem Briefing als fertig
ausformuliert — alle fünf Übungen mit vollständigem Schritttext, das Kartendeck
mit finaler Copy. Was davon im Code noch aussteht, ist eine Redaktionsaufgabe
und keine offene Produktfrage; für Marktarbeit ist der Zielzustand die richtige
Grundlage.

---

## 1 · Was Musie ist

Musie ist eine **Achtsamkeitsanwendung, deren Wirkstoff Musik ist** — und deren
Einstieg aus Papier besteht.

Die App sagt es in ihren eigenen Worten, als erste Zeile beim ersten Öffnen:

> „Hi, ich bin Musie. Ich helfe dir, achtsamer, bewusster, verbundener und
> sicherer zu fühlen und zu handeln — durch die Kraft der Musik."

Zwei Dinge unterscheiden Musie von einer Meditations-App:

**Erstens: es gibt ein physisches Produkt.** Das *Mindfulness-Cards*-Set — neun
gedruckte Bildkarten, je eine für ein Gefühl. Man zieht eine Karte, scannt ihren
QR-Code, und hört das Stück, das hinter dieser Karte liegt. Die Karte ist der
Einstieg, nicht die App: der erste Kontakt ist ein Gegenstand auf einem Tisch.

**Zweitens: Musie erzählt nicht, was man fühlen soll.** Es gibt keine Stimme,
die durch eine Atemübung zählt (nur in einer der fünf Übungen), keine
Zielvorgabe, keine Streaks, keine Punkte. Die Übung besteht aus: eine Karte
wählen → zuhören → aufschreiben, was dabei entstanden ist. Die Reflexion ist das
Produkt, nicht das Nebenprodukt.

**Der Titel eines Stücks wird bewusst verborgen**, solange man zuhört. Erst nach
90 Sekunden — nach der eigenen Reflexion — gibt Musie Titel und Künstler:in
frei. Das ist technisch bis in die Datenbankrechte hinein durchgesetzt: die
Spalten `title` und `artist` sind für den Client gesperrt, und die IDs der
Aufnahmen sind absichtlich bedeutungslos (`trk-01`, nicht `morgenlicht`), damit
nicht schon die URL die Antwort verrät. **Das ist die zentrale
Produktmechanik**: man hört, ohne zu wissen, was man hören *soll*.

---

## 2 · Die Nutzerreise

Fünf Flächen, in dieser Reihenfolge:

| | Fläche | Was passiert |
|---|---|---|
| 1 | **Über Musie** (`/`) | Musie stellt sich im Chat-Rhythmus vor — Begrüßung, Tipp-Punkte, dann ein Karussell in drei Bildern: *Übung wählen · Musie führt dich durch Übung und Reflexion · dich selbst besser fühlen und verstehen* |
| 2 | **Über dich** (`/about-you`) | Eine einzige Frage: *Hier als …* — allein, mit einer Gruppe, mit meiner Partnerin oder meinem Partner, mit einer Patientin oder einem Patienten. Kein Name, keine E-Mail, kein Alter |
| 3 | **Übungen** (`/exercises`) | Die Bibliothek: fünf Übungen als Karten, mit Dauer, Bedarf („Du brauchst: Mindfulness-Cards-Set") und einem Detail-Overlay |
| 4 | **Session** (`/session/:id/:step`) | Vier Schritte: **Intro → Karte scannen → Hören → Reflektieren.** Immer nur eine Session gleichzeitig, per Datenbank-Constraint erzwungen, nicht per Hoffnung |
| 5 | **Tagebuch** (`/diary`) | Jede beendete Session, neueste zuerst, gruppiert nach Tag — mit einem Graph über allem: eine Woche pro Blick, jeder Tag ein Stapel aus den Bildern der Übungen, die man gemacht hat |

Ein gescannter QR-Code führt über `/s/:code` direkt in die Session — man kann
also mit der Kamera-App des Telefons anfangen und landet in Musie an genau der
Karte, die man gezogen hat. Die Karte ist damit ein Werbeträger, der sich selbst
einlöst.

### Der Reflexionsschritt, und die Haltung dahinter

Drei Modi: **schreiben, sprechen, fotografieren.**

Sprechen ist gebaut und funktioniert: man spricht, Musie transkribiert live
(Satz für Satz, über eine Realtime-Transkription), man kann den Text danach
bearbeiten. **Die Aufnahme selbst wird nie gespeichert.** Das steht nicht nur im
Datenschutztext, es ist im Datenmodell verankert — es gibt keine Spalte dafür,
und das ist als Entscheidung dokumentiert und nicht als Lücke.

Fotografieren — für Leute, die auf Papier schreiben — ist als Oberfläche
vorhanden, aber die Bilderkennung ist noch nicht entschieden. Das Foto verlässt
das Gerät nicht.

Die Datenschutzhaltung ist ein **Positionierungs-Asset, kein Compliance-Text**:

- Musie fragt nie nach einem Namen.
- Ohne Konto gehört das Tagebuch dem Browser — und ist mit dessen Daten weg. Die
  App sagt das vorher, nicht im Kleingedruckten.
- Was man schreibt, kann niemand sonst lesen. Das ist mit Row-Level-Security
  abgesichert und durch einen Test bewiesen, der prüft, dass ein „alles
  löschen" die Zeilen fremder Nutzer nicht anfasst.
- Kein Tracking, keine Werbung, keine Streaks, keine Benachrichtigungen.

---

## 3 · Die fünf Übungen

Zwei bauen auf dem Kartendeck auf, drei sind Ton-Übungen ohne Papier. Alle
enden in einer Reflexion, alle landen im Tagebuch.

| | Übung (DE / EN) | Dauer | Braucht | Kern |
|---|---|---|---|---|
| 1 | **Achtsame Pause** / Mindful Pause | 2–12 min | Kartendeck | Fünf Karten ziehen, eine wählen, die dich anspricht, scannen, das Stück dahinter hören — und der Frage nachgehen, welche Szene aus Musik und Bild vor dem inneren Auge entsteht |
| 2 | **Freie Bahn** / Free Rein | 2–5 min | Kartendeck | Der schnelle Weg: eine *zufällige* Karte vom verdeckten Stapel, scannen, hören, spüren. Keine Wahl, kein Vergleich — die Übung für einen Moment zwischendurch |
| 3 | **Achtsam Atmen** / Mindful Breathing | 5–8 min | nur Ton | Das Metrum der Musik trägt den Atem. Hände auf den Bauch oder den unteren Rücken, den Atem dorthin schicken |
| 4 | **Klangreise** / Sound Journey | 12–15 min | nur Ton | Eine Stimme führt durch die Klänge und zurück in den Körper — oder man lässt die Gedanken ziehen, ohne ihnen zu folgen |
| 5 | **Bodyscan** / Body Scan | 10–12 min | nur Ton | Eine geführte Wanderung durch den Körper, Klang für Klang |

Jede Übung bringt ihren eigenen Schritttext mit — Intro, Kartenwahl, Hören,
Reflektieren, jeweils in beiden Sprachen. Die Fragen unterscheiden sich pro
Übung und pro Schritt: *Achtsame Pause* fragt nach einem Namen für die Szene,
*Freie Bahn* fragt, wie sich der Moment anfühlt. Das ist Absicht — dieselbe
Frage in jeder Übung würde den Unterschied zwischen ihnen einziehen.

**Drei Anlässe sind als Einstiegsachse angelegt**, aber noch nicht als Screen
gebaut: *Meine Gefühle spüren · In den Tag starten · An einem vollen Tag
entspannen.* Jede Übung ist einem oder mehreren Anlässen zugeordnet. Die
Datenbank merkt sich pro Session, aus welchem Anlass sie kam — nur fragt bislang
niemand danach. Für Marktarbeit relevant: **das ist die vorbereitete, aber noch
offene Segmentierung des Angebots.**

---

## 4 · Das Kartendeck und der Card Generator

### Das Deck

Neun Karten, je ein Gefühl, je eine Aufnahme:

**Freude · Trauer · Wut · Angst · Ruhe · Sehnsucht · Dankbarkeit · Einsamkeit ·
Hoffnung**

Jede Karte trägt einen Code (`MC-01` … `MC-09`) und einen QR-Code — auf der
Rückseite *und* unten links auf der Vorderseite. Der zweite ist eine
Produktentscheidung mit einem Grund: eine Karte umzudrehen ist die eine
Bewegung, die verrät, welche Karte es ist, bevor die Musik es tun darf. Also
kann man sie liegend scannen.

Kartenformat: **88 × 63 mm im Querformat**, 3 mm Beschnitt, 300 dpi. Hochformat
ist ein Flag entfernt.

Ein Detail mit Systemcharakter: **eine Aufnahme kann in zwei Übungen zu
derselben Karte gehören — und dieselbe Karte in zwei Übungen verschiedene Stücke
spielen.** Die Aufnahme ist genau einmal gespeichert und wird nur zugeordnet.
Lizenzrechtlich heißt das: ein Stück, das zwei Übungen teilen, ist **eine**
Lizenz, nicht zwei. Das skaliert in beide Richtungen — ein zweites Deck kann
dieselben Aufnahmen neu kombinieren, und eine Themenedition kostet keine neuen
Rechte.

### Der Generator

Das Deck ist **eine einzige Datei** (`deck.json`) — Karten, Codes, Gefühle in
beiden Sprachen, Alt-Texte, und welche Aufnahme in welcher Übung spielt. Alles
andere wird daraus erzeugt:

```
deck.json  ──►  Migration (das Deck in der Datenbank)
           ──►  PDF (das Deck in Druckqualität)
```

Der PDF-Generator druckt beide Kartenseiten, baut aus **denselben** Schriften
und Farbtokens wie die App (die Karte kann also gestalterisch nicht von der
Oberfläche abdriften), und kann:

- eine Einzelkarte pro Seite mit Beschnitt, für die Druckerei,
- neun Karten auf einem A4-Bogen, für einen Bürodrucker und einen Prototyp zum
  Ausschneiden,
- eine Sprache oder beide,
- eine Auswahl einzelner Karten.

Die Illustration einer Karte ersetzt das Gefühlswort, sobald sie vorliegt — das
Bild *ist* die Karte, ein Wort darüber wäre die Gestaltung im Streit mit der
Illustration. Eine Karte ohne Illustration druckt trotzdem, mit dem Gefühl als
Typografie.

**Was das strategisch bedeutet:** ein neues Deck ist eine Datei, ein Befehl und
eine Druckbestellung. Eine Edition für einen Partner, eine Klinik, eine
Buchhandlung, eine Sprache oder ein Thema ist keine Produktentwicklung. Das ist
der Hebel, den eine Marktanalyse kennen muss.

**Ein Nagel im Boden:** ein gedruckter QR-Code trägt eine absolute URL. Die
Domain ist noch nicht gewählt, und mit dem ersten Druck ist sie für die Auflage
unwiderruflich. Fünfhundert Karten lassen sich nicht umbenennen. Darum ist die
Domainentscheidung die einzige Entscheidung mit einer echten Uhr daran.

---

## 5 · Das Tagebuch

Nicht eine Liste von Übungen, sondern eine **Liste von Momenten**. Die
Überschrift einer Karte ist „Session vom …", nicht der Name der Übung — drei
Sitzungen derselben Übung waren vorher drei Karten mit einer Überschrift.

Auf jeder Karte steht die Frage der Übung über der eigenen Antwort, damit die
Antwort als Antwort liest. Alles Faktische — Übung, Abbruchzeitpunkt, Status —
ist hinter „Session-Details" weggefaltet. Löschen ist nicht weggefaltet: eine
zerstörende Handlung hinter einer Klappe ist schwerer zu finden, wenn man sie
will, und nicht schwerer zu treffen, wenn man sie nicht will.

Darüber ein Graph: eine Woche pro Blick, jeder Tag ein Stapel aus den Bildern
der gemachten Übungen, wochenweise zurück bis zur ersten Session. Er ist
technisch eine Liste von Links, die wie ein Diagramm gezeichnet ist — Tastatur,
Fokus und Seitensuche funktionieren.

Man kann eine Session löschen, und man kann alles löschen. Beides ohne Nachfrage
per E-Mail, beides sofort, beides endgültig.

---

## 6 · Technischer und operativer Stand, kurz

Nur soweit es für Strategiearbeit zählt:

- **Die App ist live**, auf Cloudflare Workers, hinter einem Anmelde-Gate.
  Konten werden im geschlossenen Test **von Hand ausgegeben** — es gibt noch
  keine Selbstregistrierung, weil die dafür nötige E-Mail-Zustellung eine Domain
  braucht, die noch nicht gewählt ist.
- Datenbank in Frankfurt (Supabase). Deutsche und englische Oberfläche,
  vollständig zweisprachig, Sprache umschaltbar ohne Neuladen.
- Eigenes Designsystem mit 29 Komponenten und veröffentlichter Dokumentation.
  Das ist ungewöhnlich weit für dieses Stadium und ein Grund, warum eine zweite
  Fläche — Web, Kiosk, Partner-Oberfläche — nicht bei Null anfängt.
- 28 Testdateien, inklusive Sicherheitstests, die beweisen, dass niemand das
  Tagebuch eines anderen lesen oder löschen kann.
- **Zwei Usability-Tests sind gelaufen** (der zweite Ende September 2026); das
  Tagebuch ist danach überarbeitet worden. Es gibt also frühe
  Nutzerbeobachtungen, aber keine quantitativen Nutzungsdaten — das Produkt hat
  noch keine Kohorte.
- Musik: vier der neun Kartenstücke sind lizenziert (Epidemic Sound, als
  **Abonnement**, nicht als Einzelfreigabe — was für eine kommerzielle Auflage
  eigens geprüft werden muss). Die übrigen Aufnahmen sowie die Stücke für die
  drei Ton-Übungen stehen aus.

---

## 7 · Was es noch nicht gibt — und wo du ansetzt

Das ist die eigentliche Arbeitsfläche. Keine dieser Fragen ist im Produkt
beantwortet:

**Geschäftsmodell.** Es gibt keinen Preis, kein Abo, keinen Warenkorb, keinen
Zahlungsanbieter und keine Entscheidung darüber, was verkauft wird: das Deck,
der Zugang, beides, oder das Deck als Zugang. Die naheliegende Struktur — Karten
kaufen, App gratis nutzen — ist nie ausgeschrieben worden, und die Alternativen
(Abo mit Deck als Onboarding-Geschenk, B2B-Lizenz pro Praxis, Editionen) sind
nicht verglichen.

**Vertriebsweg des physischen Produkts.** Kein Drucker beauftragt, keine
Auflagengröße, keine Stückkosten, kein Versand, kein Handel. Ein physisches
Produkt hat ein Lager und eine Marge; beides existiert bislang nur als Idee.

**Zielgruppe, in Wahrheit offen.** Die App fragt „Hier als …" und nennt vier
Antworten — allein, Gruppe, Partnerschaft, Patient:in. Gebaut ist **nur
„allein"**. Die anderen drei sind je ein anderes Geschäft: Gruppe riecht nach
Workshops und Bildung, Partnerschaft nach Geschenk und Handel, Patient:in nach
Therapie, Erstattung und Regulierung. **Diese Auswahl ist die wichtigste offene
Entscheidung und sie ist bewusst noch nicht getroffen.**

**Positionierung gegen einen Markt, den niemand vermessen hat.** Musie steht
zwischen mindestens vier Regalen: Meditations-Apps, Musiktherapie,
Kartendecks/Kartensets für Selbstreflexion und Journaling-Apps. Es gibt keine
Wettbewerbsanalyse, keine Preisvergleiche, keine Kategorieentscheidung. Dass
Musie in keins der vier Regale ganz passt, ist als Produktqualität
beschrieben — als Marktposition ist es noch keine.

**Marke und Name.** Domain offen. Kein Logo-Wortmarken-Prozess dokumentiert,
keine Markenrecherche, keine Namensprüfung gegen bestehende Anbieter.

**Zugänglichkeit als Marktzugang.** Der Kern des Produkts ist Hören und
gedrucktes Papier. Was das für hörbeeinträchtigte oder sehbeeinträchtigte
Menschen bedeutet, ist in der Software gewissenhaft behandelt (Alt-Texte,
Tastaturbedienung, Kontrast), als *Marktfrage* aber nie gestellt.

**Regulatorik.** Musie macht kein Heilversprechen und stellt keine Diagnose —
aber „mit einer Patientin" als Nutzungsart steht in der App. Sobald eine
therapeutische Zielgruppe adressiert wird, ändern sich die Anforderungen (MDR,
Datenschutz in der Behandlung, Erstattung). Nicht geprüft.

---

## 8 · Vokabular — bitte benutze diese Wörter

Die Begriffe sind im Produkt streng geführt. Eine Analyse, die sie durchhält,
ist direkt anschlussfähig:

| Wort | Bedeutung |
|---|---|
| **Übung** (*exercise*) | Eine der fünf Anleitungen. Nie „Methode" — der Begriff ist bewusst ausgemustert |
| **Session** | Ein einzelner Durchlauf einer Übung, von Intro bis Reflexion |
| **Karte** | Eine der neun gedruckten Bildkarten mit einem Gefühl |
| **Deck** | Das komplette Mindfulness-Cards-Set |
| **Reflexion** | Was man am Ende schreibt oder spricht. Immer Text, egal wie eingegeben |
| **Tagebuch** (*diary*) | Alle beendeten Sessions einer Person |
| **Anlass** (*situation*) | Der Grund, aus dem jemand eine Übung startet — angelegt, noch nicht gefragt |
| **Reveal** | Die Freigabe von Titel und Künstler:in nach dem Hören |

Und die Anrede: **du**, klein, durchgehend. Kein „Bitte", keine
Ausrufezeichen, keine Aufmunterung. Musie fordert nichts.
