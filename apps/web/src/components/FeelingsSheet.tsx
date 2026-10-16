/**
 * Naming a feeling, by narrowing rather than by reading 128 words.
 *
 * `/session/:id/reflect?focus-feelings`. One `DrillDown` through the emotion
 * wheel — 8 primary feelings, 40 below them, 80 below those — and two
 * actions that appear only once something has been chosen.
 *
 * ── WHY THIS EXISTS AT ALL ────────────────────────────────────────────────
 * User testing: people cannot name what they just felt. The reflect step
 * never offered a vocabulary, so "wie war das für dich?" had no answer and
 * the step was answered with nothing or with prose about something else.
 * A vocabulary you narrow into is the thing a blank field cannot be.
 *
 * ── A PICK IS WRITTEN IMMEDIATELY — Ben, 2026-10-16 ───────────────────────
 * Not held and saved with the session. The session row already exists, so
 * nothing blocks the insert, and a closed tab then keeps the feelings
 * somebody named. It is the one place this feature departs from how the
 * reflection works, and `reflect.incomplete.*` has to stay honest about it:
 * *Trotzdem speichern* does not save the feelings, because they are already
 * saved.
 *
 * ── THE ACTIONS ARE PROGRESSIVELY DISCLOSED — Ben, 2026-10-16 ─────────────
 * *"The actions are only displayed once a feeling is selected."* Selected IN
 * THIS VISIT, confirmed: reopening a sheet with three feelings already held
 * arrives with an empty foot and the Lightbox × as the way out. That is what
 * keeps *Weiteres Gefühl festhalten* honest — it only means something once
 * there is a "this one" to add another to.
 *
 * ── THE STOP ROW SAVES AND CLOSES; A LEAF SAVES AND WAITS ─────────────────
 * Ben, 2026-10-16: *"Clicking on the 'Einfach nur…' option also closes the
 * sheet and persists the selected option."*
 *
 * The asymmetry is the meaning. Taking the stop is somebody saying *that is
 * the word, I am done narrowing* — so the sheet has nothing left to ask and
 * gets out of the way. Taking a leaf at the bottom is a pick they may well
 * want to add to, so the sheet stays and offers both.
 *
 * TOLD APART FROM THE PATH ALONE, with no second argument from `DrillDown`:
 * the last node of a stop pick still HAS children — they are what was
 * stopped above — and a leaf has none.
 *
 * ── AND ONLY ONE PICK PER LEVEL ──────────────────────────────────────────
 * *"On the third level, only one option can be selected in one go. Before
 * selecting another one, the user needs to click Weiteres Gefühl
 * festhalten."* `DrillDown` locks itself after a pick; this sheet's reset
 * button is what unlocks it, by remounting the component.
 *
 * ── THE SOFT CAP IS FIVE, AND IT IS NOT A CONSTRAINT ──────────────────────
 * Past five the foot offers only *Ich bin fertig*. Nothing is blocked, no
 * error is shown, and removing one on /reflect makes room. A sixth row
 * inserted by any other route is legal — logged in OPEN-QUESTIONS.md.
 */
import * as React from 'react';
import { ButtonGroup, CtaButton, DrillDown, Message, RadioGroupText, Sheet } from '@musie/design-system';
import type { DrillDownLevel, DrillDownNode } from '@musie/design-system';
import { useLocale, useT } from '../i18n/localeContext';
import { FEELINGS_SOFT_CAP, idOf, pathOf, wheelAsTree } from '../lib/feelings';
import type { HeldFeeling } from '../lib/feelings';

export interface FeelingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is already held — so the wheel can refuse a repeat, and so the cap
   *  knows where it is. */
  held: HeldFeeling[];
  /** Resolves 'added' or 'already-held'; throws only on a real failure. */
  onPick: (id: string) => Promise<'added' | 'already-held'>;
  /** The last write that failed, if one did. Drawn in the foot. */
  error: Error | null;
}

export function FeelingsSheet({
  open, onOpenChange, held, onPick, error,
}: FeelingsSheetProps) {
  const t = useT();
  const { locale } = useLocale();

  /**
   * HAS ANYTHING BEEN PICKED IN THIS VISIT — the progressive-disclosure gate,
   * and the reason it is a count rather than a boolean is `key` below.
   */
  const [pickedHere, setPickedHere] = React.useState(0);

  /**
   * REMOUNTS `DrillDown`, which is how *Weiteres Gefühl festhalten* resets it
   * to level 1. A `key` change rather than an imperative handle: "the same
   * component, a fresh start" is what React already has a word for.
   *
   * It also resets on OPEN, so the sheet never reopens half way down a branch
   * somebody left three minutes ago.
   */
  const [run, setRun] = React.useState(0);

  const [alreadyHeld, setAlreadyHeld] = React.useState(false);

  /**
   * HOW DEEP THE DRILL-DOWN IS, so the foot can appear from level 2 down.
   *
   * Reported by `DrillDown` from an effect rather than read in render: the
   * depth lives inside its path, and the slot is handed it during a render,
   * which is the one place a consumer may not put it into state.
   */
  const [depth, setDepth] = React.useState(0);
  /**
   * What the pre-checked stop row would commit at the level on screen, and
   * `null` at level 1 where there is no stop. See *Ich bin fertig* below:
   * it is what stops that button discarding a visible selection.
   */
  const [stopId, setStopId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setPickedHere(0);
    setRun((n) => n + 1);
    setAlreadyHeld(false);
    setDepth(0);
    setStopId(null);
  }, [open]);

  const tree = React.useMemo(() => wheelAsTree(locale), [locale]);
  const heldIds = React.useMemo(() => held.map(idOf), [held]);

  const atCap = held.length >= FEELINGS_SOFT_CAP;

  /**
   * Write one feeling by its node id, and close the sheet when the pick was
   * a STOP. Taken by two callers — a tapped row, and *Ich bin fertig*
   * standing in for the pre-checked stop — which is why `viaStop` is an
   * argument here rather than being re-derived in each.
   */
  const commit = React.useCallback(async (nodeId: string, viaStop: boolean) => {
    /* Decoded here rather than in the sheet's caller so a malformed id — which
       can only come from a tree this file built — dies at the boundary. */
    if (pathOf(nodeId) === null) return;
    try {
      const result = await onPick(nodeId);
      setAlreadyHeld(result === 'already-held');
      if (result === 'added') {
        setPickedHere((n) => n + 1);
        /* THE STOP CLOSES THE SHEET. Only on a real write — an
           already-held row leaves it open so the message can be read, and a
           failure leaves it open so the error can. */
        if (viaStop) onOpenChange(false);
      }
    } catch {
      /* The error is the caller's state and is drawn in the foot. Swallowed
         here so an unhandled rejection does not reach the console on a
         failure the screen has already reported. */
    }
  }, [onPick, onOpenChange]);

  /** *Ich bin fertig* committing the stop. Always a stop, hence `true`. */
  const pickId = React.useCallback(
    (nodeId: string) => commit(nodeId, true),
    [commit],
  );

  /** A row was activated in the drill-down. */
  const pick = React.useCallback((path: readonly DrillDownNode[]) => {
    const last = path[path.length - 1];
    if (last === undefined) return;
    /* STOP OR LEAF, read off the path: a stop's last node still has the
       children it stopped above, and a leaf has none. See the header. */
    void commit(last.id, (last.children?.length ?? 0) > 0);
  }, [commit]);

  /* ── THE SLOT ────────────────────────────────────────────────────────────
     `DrillDown` draws no rows; this is what it draws instead. Rule 7 all the
     way down — every string the level shows is passed, including the one that
     tells a screen reader what the → means. */
  const level = React.useCallback((l: DrillDownLevel) => (
    <RadioGroupText
      /* Per depth, so base-ui treats a new level as a new group rather than
         carrying a checked value across it. */
      name={`feelings-level-${l.depth}`}
      /* EACH LEVEL IS ITS OWN QUESTION, and a fieldset needs its own name
         (1.3.1, 4.1.2). Hidden, because the sheet's header already asks it at
         level 1 and the back row already says it below that. */
      legend={l.parent === null ? t('reflect.feelings.sheet.headline') : l.parent.label}
      legendHidden
      options={l.options.map((o) => ({
        value: o.value,
        /* A disabled row says WHY in its label. The component has no per-row
           reason slot, and a row that is simply greyed out is the product
           refusing without explaining.

           ONLY WHEN THE LEVEL IS NOT LOCKED. Two different things grey a row
           out: it is already held, or a pick has just been taken and the
           level is closed until *Weiteres Gefühl festhalten*. Measured on
           screen, this said "hältst du schon fest" on all three rows of a
           locked level — including the two nobody is holding, which is the
           product explaining itself wrongly rather than not at all. When the
           level is locked the reason is the lock, and the row the user just
           chose is sitting there checked, saying it. */
        label: o.disabled && !l.locked
          ? t('reflect.feelings.sheet.heldRow', { feeling: o.label })
          : o.label,
        disabled: o.disabled,
        drillDown: o.drillDown,
        drillDownLabel: o.drillDown ? t('reflect.feelings.sheet.more') : undefined,
      }))}
      value={l.value}
      /* ── TWO EVENTS, AND THEY ARE NOT THE SAME ONE ────────────────────
         `onValueChange` is the arrow keys moving the checked row: a
         highlight, and it must never navigate, or a keyboard user cannot
         read the list without being taken somewhere by every row they pass.

         `onOptionActivate` is a click, or Enter/Space — and it is the only
         one that works for the row this level is built around. *einfach nur
         {x}* arrives PRE-CHECKED, and a checked native radio fires no
         change when it is clicked again, so under `onValueChange` alone the
         one row somebody is most likely to tap would be the one row that
         did nothing. */
      onValueChange={l.onHighlight}
      onOptionActivate={l.onChoose}
      emptyLabel={t('reflect.feelings.sheet.empty')}
    />
  ), [t]);

  /**
   * ── THE FOOT APPEARS FROM LEVEL 2 — Ben, 2026-10-16 ─────────────────────
   *
   * *"Zeige im Feelings sheet ab dem 2. Level die Buttons an, um es Users
   * einfacher zu machen die richtige Auswahl schnell zu treffen."*
   *
   * It used to wait for a pick. That was right while the stop row was just
   * another option, and became wrong once the stop arrived PRE-CHECKED: from
   * level 2 there is always an answer selected, so there is always something
   * *Ich bin fertig* could mean. Making somebody pick first in order to be
   * shown the button that finishes is the step asking for a tap it does not
   * need.
   *
   * Level 1 still shows nothing, and that is not an inconsistency: nothing
   * is checked there, so neither button has anything to act on yet. The ×
   * is the way out of a sheet nobody has answered.
   */
  const foot = depth === 0 && pickedHere === 0 && !alreadyHeld ? undefined : (
    <div className="musie-stack">
      {error !== null && (
        <Message
          variant="error"
          live="assertive"
          headingLevel={3}
          headline={t('reflect.feelings.sheet.failed')}
        />
      )}
      {alreadyHeld && (
        <Message
          variant="info"
          live="polite"
          headingLevel={3}
          headline={t('reflect.feelings.sheet.alreadyHeld')}
        />
      )}
      <ButtonGroup purpose="continue-only">
        {/* ── IT COMMITS WHAT IS SELECTED, THEN CLOSES ──────────────────
            From level 2 the stop row is ALREADY CHECKED, so a *done* button
            that merely closed would throw away the thing on screen saying
            it had been chosen. That is the trap showing the foot early
            would otherwise open.

            So: nothing picked in this visit and a stop available → commit
            it, exactly as tapping the row would. Something already picked
            → it is already written, and this just closes. */}
        <CtaButton
          variant="primary"
          onClick={() => {
            if (pickedHere === 0 && stopId !== null) { void pickId(stopId); return; }
            onOpenChange(false);
          }}
        >
          {t('reflect.feelings.sheet.done')}
        </CtaButton>
        {/* ONLY BELOW THE CAP. Not disabled — a disabled control here would
            be the product explaining a limit nobody asked about. It simply
            stops offering, and removing one on /reflect brings it back. */}
        {!atCap && (
          <CtaButton
            variant="outline"
            onClick={() => { setRun((n) => n + 1); setAlreadyHeld(false); }}
          >
            {t('reflect.feelings.sheet.another')}
          </CtaButton>
        )}
      </ButtonGroup>
    </div>
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      /* Rule 7, twice over. `title` is announced and never drawn — Sheet's
         own contract — and `closeLabel` exists because Lightbox underneath
         defaults to the German *Schließen*. */
      title={t('reflect.feelings.sheet.title')}
      closeLabel={t('common.closeLabel')}
      /* NO `origin`. The sheet is opened from three places — the section's
         button, the incomplete dialog, and a deep link — and a grow-from
         animation that is right for one is wrong or impossible for the other
         two. The goal sheet has exactly one door and can afford it. */
      origin={null}
      /* ── TOP, NOT DISTRIBUTED — Ben, 2026-10-16 ───────────────────────
         `Sheet`'s default centres a single body in the room between the
         header and the foot, which is right for one screen to look at and
         wrong for a column somebody reads or works down. Measured on screen:
         the drill-down's three rows sat in the middle of a tall sheet with
         the question stranded at the top. */
      contentAlign="top"
      className="musie-reflect-sheet"
      header={
        <h2 className="musie-reflect-sheet__headline">
          {t('reflect.feelings.sheet.headline')}
        </h2>
      }
      foot={foot}
    >
      <DrillDown
        key={run}
        nodes={tree}
        onPick={pick}
        disabledIds={heldIds}
        onDepthChange={(next, stop) => { setDepth(next); setStopId(stop); }}
        stopLabel={(parent) => t('reflect.feelings.sheet.just', { feeling: parent })}
        backLabel={(parent) => t('reflect.feelings.sheet.back', { feeling: parent })}
        levelLabel={(parent, count) => t('reflect.feelings.sheet.level', {
          feeling: parent, count: String(count),
        })}
      >
        {level}
      </DrillDown>
    </Sheet>
  );
}
