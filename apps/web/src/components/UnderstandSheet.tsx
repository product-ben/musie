/**
 * Why any of this is worth doing — `?focus-understand`.
 *
 * ── IT IS A DOOR, NOT A PARAGRAPH ON THE STEP ────────────────────────────
 * This content used to be `reflect.welcome.text`, four sentences standing on
 * /reflect under the headline. The content was right and the placement was
 * not: the whole point of the rework is that the step carries less, and a
 * paragraph justifying the two doors is exactly what somebody who already
 * wants to reflect has to read past to reach them.
 *
 * Behind a door whose label is the question — *Was soll das bringen?* —
 * nobody who is not asking it has to decline the answer.
 *
 * ── THE THIRD FAILURE USER TESTING FOUND ─────────────────────────────────
 * People could not find words, could not name the feeling, and **had never
 * been told why putting an observation into words helps**. The first two are
 * answered by the other two sheets. This one is the third, and it is the
 * only one of the three that is answered with prose rather than with a
 * control.
 *
 * ── AND IT LETS YOU OFF AT THE END ───────────────────────────────────────
 * *Wenn nicht, ist das auch oke* — Ben's own line, and the most important
 * one here. The two doors on the step are optional; a page that argues for
 * them without saying so is arguing.
 *
 * ── NO STATE, NO WRITE, NO CONSEQUENCE ───────────────────────────────────
 * Opening it records nothing and changes nothing. It is the one sheet in
 * this step that is purely something to read, which is why it has a single
 * way out and no actions.
 */
import { CtaButton, Sheet } from '@musie/design-system';
import { useT } from '../i18n/localeContext';

export interface UnderstandSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnderstandSheet({ open, onOpenChange }: UnderstandSheetProps) {
  const t = useT();

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      /* Rule 7 twice. `title` is announced and never drawn — Sheet's own
         contract — and it is NOT the headline: the headline is the question,
         and a title that asked it again would have a screen reader hear the
         question twice before the answer. */
      title={t('reflect.understand.sheet.title')}
      closeLabel={t('common.closeLabel')}
      /* Same reasoning as the other two sheets: more than one door in, so a
         grow-from-origin animation would be right for one and wrong for the
         rest. */
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
          {t('reflect.understand.sheet.headline')}
        </h2>
      }
      foot={
        <CtaButton variant="primary" onClick={() => onOpenChange(false)}>
          {t('reflect.understand.sheet.done')}
        </CtaButton>
      }
    >
      <p className="musie-reflect__why">{t('reflect.understand.sheet.text')}</p>
    </Sheet>
  );
}
