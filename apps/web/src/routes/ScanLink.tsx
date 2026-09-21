/**
 * `/s/:code` — where a QR code on a paper card lands. E.0.
 *
 * ── THIS IS THE COMMON WAY IN, AND IT NEVER OPENS MUSIE'S CAMERA ───────────
 * The code printed on a card carries `<origin>/s/MC-01`. A phone's own camera
 * app reads that without Musie being open, which means the ordinary path from
 * a printed card to a running session goes through this route rather than
 * through the in-app reader — and it works today, before E.2 and E.3 exist.
 * That is what E.0 bought.
 *
 * ── SAME-ORIGIN, WHICH IS WHY NO DOMAIN IS NEEDED ─────────────────────────
 * The route is relative. It resolves on `localhost:5173`, on a LAN address a
 * phone can reach, on a Netlify preview and on whatever domain eventually
 * exists, with nothing configured anywhere. The decoder never compares a host
 * (lib/scanCode.ts), so a code printed for one origin still decodes at
 * another — which matters exactly once, on the day the domain changes and the
 * cards are already printed.
 *
 * ── IT IS A RESOLVER, NOT A SCREEN ────────────────────────────────────────
 * The happy path renders nothing: it writes the card to the running session
 * and replaces itself with that session's scan step. The four states below are
 * the ways that cannot happen, and none of them is dressed as an error —
 * "nothing is running yet" is the commonest of them and is simply what
 * happens when somebody with the deck in their hands scans a card first.
 *
 * `replace`, so Back from the session does not land on a resolver that would
 * resolve all over again.
 */
import { Link, Navigate, useParams } from 'react-router';
import { ContentBox, CtaButton, Message } from '@musie/design-system';
import { useLocale, useT } from '../i18n/localeContext';
import { getCardByCode, getExercise } from '../lib/content';
import { holdCode, scanCardInto } from '../lib/scan';
import { decodeScan } from '../lib/scanCode';
import { readActiveSession, readSession } from '../lib/session';
import { useAsync } from '../lib/useAsync';
import type { StepId } from '../routeHandle';

/** What the link turned out to mean. */
type Landing =
  /** Written to the running session; the scan step is where the person goes. */
  | { kind: 'applied'; sessionId: string }
  /** The link did not carry a card code at all. */
  | { kind: 'malformed' }
  /** A well-formed code that this deck does not have. */
  | { kind: 'unknown'; code: string }
  /** Nothing is running, so the code is held for the scan step. */
  | { kind: 'no-session'; code: string }
  /** The running session's exercise draws no cards. */
  | { kind: 'cardless'; sessionId: string; step: StepId };

export function ScanLink() {
  const t = useT();
  const { locale } = useLocale();
  const params = useParams();

  const scanned = params.code ?? '';

  const { data, loading, error } = useAsync<Landing>(async () => {
    const code = decodeScan(scanned);
    if (code === null) return { kind: 'malformed' };

    /* BOTH READS AT ONCE. Whether the card exists and whether a session is
       running are independent questions, and the answer to this route needs
       both — so asking them in series would make the common path twice as
       slow for no reason. */
    const [card, active] = await Promise.all([
      getCardByCode(code, locale),
      readActiveSession(),
    ]);

    /* The card is checked BEFORE the session is considered, so a mistyped or
       foreign code is never held for later and never written to anything. */
    if (card === null) return { kind: 'unknown', code };

    if (active === null) {
      holdCode(code);
      return { kind: 'no-session', code };
    }

    /* The row, for its exercise — the deep link knows a card and a session,
       and nothing yet about whether this exercise uses the deck. */
    const row = await readSession(active.id);
    if (row === null) {
      /* Read back as gone between one request and the next. Treat it as
         nothing running, which is what it now is. */
      holdCode(code);
      return { kind: 'no-session', code };
    }

    const exercise = await getExercise(row.exerciseId, locale);
    if (exercise === null) {
      throw new Error(`[musie] session ${row.id} names an exercise that is not there`);
    }
    if (!exercise.needsCards) {
      return { kind: 'cardless', sessionId: row.id, step: row.step };
    }

    /* THE SAME FUNCTION THE TYPED CODE CALLS. Not a second implementation of
       "find the pairing and write both columns" — lib/scan.ts exists so that
       a scanned card and a typed one are one act. */
    const outcome = await scanCardInto(row.id, row.exerciseId, code, locale);
    if (outcome.kind !== 'applied') {
      /* Unreachable in practice: the card was just read back successfully, so
         it is neither malformed nor unknown. Narrowed rather than cast — the
         day the outcome set grows, this is where it shows up. */
      return outcome.kind === 'malformed' ? { kind: 'malformed' } : { kind: 'unknown', code };
    }

    return { kind: 'applied', sessionId: row.id };
  }, `scan:${scanned}:${locale}`);

  if (loading) return <p className="musie-note">{t('scan.working')}</p>;

  if (error !== null || data === null) {
    return (
      <Message
        variant="error"
        live="assertive"
        headingLevel={1}
        headline={t('content.error')}
        text={t('content.errorDetail')}
      />
    );
  }

  /* THE HAPPY PATH RENDERS NOTHING. The card is already on the row, and the
     scan step is where it is on screen — going anywhere else would mean
     reading back what was just written in a second place. */
  if (data.kind === 'applied') {
    return <Navigate to={`/session/${encodeURIComponent(data.sessionId)}/scan`} replace />;
  }

  if (data.kind === 'cardless') {
    return (
      <ContentBox
        headingLevel={1}
        headline={t('scan.cardless.title')}
        text={t('scan.cardless.text')}
        outline="dashed"
      >
        <CtaButton
          variant="secondary"
          render={<Link to={`/session/${encodeURIComponent(data.sessionId)}/${data.step}`} />}
        >
          {t('scan.cardless.action')}
        </CtaButton>
      </ContentBox>
    );
  }

  /* The three that end at the library. Two are a mistake and one is simply
     early, so they differ in what they SAY and not in where they go — the one
     thing to do next is the same in all three. */
  const [headline, text] =
    data.kind === 'malformed'
      ? [t('scan.malformed.title'), t('scan.malformed.text')]
      : data.kind === 'unknown'
        ? [t('scan.unknown.title'), t('scan.unknown.text', { code: data.code })]
        : [t('scan.noSession.title', { code: data.code }), t('scan.noSession.text')];

  return (
    <ContentBox headingLevel={1} headline={headline} text={text} outline="dashed">
      <CtaButton variant="secondary" render={<Link to="/exercises" />}>
        {t('scan.chooseExercise')}
      </CtaButton>
    </ContentBox>
  );
}
