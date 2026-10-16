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
 * ── THE SOFT CAP IS FIVE, AND IT IS NOT A CONSTRAINT ──────────────────────
 * Past five the foot offers only *Ich bin fertig*. Nothing is blocked, no
 * error is shown, and removing one on /reflect makes room. A sixth row
 * inserted by any other route is legal — logged in OPEN-QUESTIONS.md.
 */
import * as React from 'react';
import { ButtonGroup, CtaButton, DrillDown, Message, RadioGroupText, Sheet } from '@musie/design-system';
import type { DrillDownLevel } from '@musie/design-system';
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

  React.useEffect(() => {
    if (!open) return;
    setPickedHere(0);
    setRun((n) => n + 1);
    setAlreadyHeld(false);
  }, [open]);

  const tree = React.useMemo(() => wheelAsTree(locale), [locale]);
  const heldIds = React.useMemo(() => held.map(idOf), [held]);

  const atCap = held.length >= FEELINGS_SOFT_CAP;

  const pick = React.useCallback(async (path: readonly { id: string }[]) => {
    const leaf = path[path.length - 1];
    if (leaf === undefined) return;
    /* Decoded here rather than in the sheet's caller so a malformed id — which
       can only come from a tree this file built — dies at the boundary. */
    if (pathOf(leaf.id) === null) return;
    try {
      const result = await onPick(leaf.id);
      setAlreadyHeld(result === 'already-held');
      if (result === 'added') setPickedHere((n) => n + 1);
    } catch {
      /* The error is the caller's state and is drawn in the foot. Swallowed
         here so an unhandled rejection does not reach the console on a
         failure the screen has already reported. */
    }
  }, [onPick]);

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
           refusing without explaining. */
        label: o.disabled ? t('reflect.feelings.sheet.heldRow', { feeling: o.label }) : o.label,
        disabled: o.disabled,
        drillDown: o.drillDown,
        drillDownLabel: o.drillDown ? t('reflect.feelings.sheet.more') : undefined,
      }))}
      value={l.value}
      onValueChange={l.onChoose}
      emptyLabel={t('reflect.feelings.sheet.empty')}
    />
  ), [t]);

  const foot = pickedHere === 0 && !alreadyHeld ? undefined : (
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
        <CtaButton variant="primary" onClick={() => onOpenChange(false)}>
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
