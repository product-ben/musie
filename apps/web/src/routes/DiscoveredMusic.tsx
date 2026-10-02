/**
 * `/discovered-music` — the recordings you have actually played, given back.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * User testing, 2026-09-25: U5 arrived with a meditation app's model — "pick a
 * track and listen to it" — and met a product that hands you music inside an
 * exercise and never gives it back. Ben's action was a place where it is given
 * back, for re-use away from Musie. *Headline, an intro that says what this
 * music is and what to use it for, and one row per track with simply the
 * player.* That is the whole brief and this screen is the whole of it.
 *
 * ── THE TITLE IS NOT A COLUMN WE CAN READ ─────────────────────────────────
 * `tracks.title` and `tracks.artist` are withheld by column grant: naming
 * either in a query fails the whole request with 42501. The only door is
 * `reveal-track`, which takes a SESSION id and never a track id, so that
 * nobody can enumerate nine names without listening to anything. Each row
 * therefore carries the session in which it was first played, and asks once.
 *
 * ONE CALL PER ROW, and that is fine at this size: nine recordings exist. If
 * the deck ever grows to the point where this is a page of requests, the
 * answer is a reveal that takes a list of sessions — not a client-side cache,
 * which would be the same number of calls spread over more screens.
 *
 * ── ONE PLAYER AT A TIME ──────────────────────────────────────────────────
 * The parent owns which row is sounding. Two tracks playing over each other is
 * not a feature of a list of players, and leaving each row to its own state is
 * exactly how it happens.
 */
import * as React from 'react';
import { Link } from 'react-router';
import { ContentBox, CtaButton, Message, MusicPlayer } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import { useTrackSource } from '../lib/audio';
import { getDiscovered } from '../lib/discovered';
import type { DiscoveredTrack } from '../lib/discovered';
import { useProfile } from '../lib/profileContext';
import { revealTrack } from '../lib/reveal';
import { useAsync } from '../lib/useAsync';

/**
 * ONE ROW. Its own signed URL, its own `<audio>`, its own position — none of
 * which can be lifted, because a hook cannot be called in a loop by the
 * parent. What IS lifted is whether this row is the sounding one.
 */
function TrackRow({
  track, active, onPlay,
}: {
  track: DiscoveredTrack;
  active: boolean;
  onPlay: () => void;
}) {
  const t = useT();
  const media = React.useRef<HTMLAudioElement>(null);
  const { url } = useTrackSource(track.src);

  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const [label, setLabel] = React.useState<string | null>(null);

  /* THE NAME, ASKED FOR ONCE. `tooEarly` should be unreachable — `listened_at`
     is only ever written on the listen step, so every session that got this
     far is at `listen` or past it — and `silent` cannot happen either, because
     a row with no file never became a row. Both are therefore treated as the
     bug they would be: the player keeps the neutral name and says nothing
     untrue. */
  React.useEffect(() => {
    let cancelled = false;
    void revealTrack(track.sessionId).then((outcome) => {
      if (cancelled) return;
      if (outcome.kind === 'revealed') {
        setLabel(t('discovered.trackLabel', {
          title: outcome.track.title,
          artist: outcome.track.artist,
        }));
      }
    });
    return () => { cancelled = true; };
  }, [track.sessionId, t]);

  /* ANOTHER ROW TOOK OVER. The element is paused from here rather than by the
     row that started — a component does not reach into its siblings. */
  React.useEffect(() => {
    if (active) return;
    media.current?.pause();
  }, [active]);

  function toggle() {
    const element = media.current;
    if (element === null) return;

    /* Ended restarts from zero: the glyph promised a restart, so resuming from
       the end would be a lie. The same rule the listen step states. */
    if (track.durationSeconds > 0 && position >= track.durationSeconds) {
      element.currentTime = 0;
      setPosition(0);
    }

    if (playing) {
      element.pause();
      return;
    }
    onPlay();
    element.play().catch((thrown: unknown) => {
      /* The file is gone, the signed URL expired, or the browser refused the
         gesture. Logged rather than swallowed: all three look identical from
         here and none of them should pass silently. */
      console.warn('[musie] could not play a discovered track:', thrown);
      setPlaying(false);
    });
  }

  return (
    <li className="musie-discovered__row">
      <MusicPlayer
        title={label ?? t('discovered.unnamed')}
        duration={track.durationSeconds}
        position={position}
        playing={playing}
        /* The URL is a round trip, so a row can be on screen before it can
           sound. Disabled says so, where a control that did nothing would not. */
        disabled={url === null}
        onTogglePlay={toggle}
        onRestart={toggle}
        onSeek={(seconds) => {
          const element = media.current;
          if (element !== null) element.currentTime = seconds;
          setPosition(seconds);
        }}
        playLabel={t('discovered.play')}
        pauseLabel={t('discovered.pause')}
        restartLabel={t('discovered.restart')}
        seekLabel={t('discovered.seek')}
      />
      {url !== null && (
        <audio
          ref={media}
          src={url}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
          /* Pinned to the full duration rather than left wherever the last
             timeupdate landed: that is what puts the button into `ended`. */
          onEnded={() => setPosition(track.durationSeconds)}
        />
      )}
    </li>
  );
}

export function DiscoveredMusic() {
  const t = useT();
  const { profile } = useProfile();
  const { data, loading, error } = useAsync(getDiscovered, 'discovered-music');
  const [sounding, setSounding] = React.useState<string | null>(null);

  let body;
  if (loading) {
    body = <p className="musie-note">{t('content.loading')}</p>;
  } else if (error !== null) {
    body = (
      <Message
        variant="error"
        live="assertive"
        headingLevel={2}
        headline={t('content.error')}
        text={t('content.errorDetail')}
      />
    );
  } else if (data === null || data.length === 0) {
    /* THE OPENING SCREEN, NOT AN EDGE CASE — Ben, 2026-10-02. `listened_at` is
       null for every session written before the migration that added it, and
       there is no honest backfill, so every existing account lands here. It
       says where music comes from and offers the one act that produces some.

       THE BUTTON GOES WHERE THE DRAWER'S *Start a session* GOES, by the same
       rule and on the same column: /exercises once a user type is recorded,
       /about-you before that. A second rule for one journey is how two entry
       points drift apart. The label is the drawer's own, for the same reason —
       one action, one name. */
    body = (
      <div className="musie-discovered__empty">
        <p className="musie-note">{t('discovered.empty')}</p>
        <p className="musie-note">{t('discovered.emptyDetail')}</p>
        <CtaButton
          render={<Link to={profile?.user_type_id ? '/exercises' : '/about-you'} />}
        >
          {t('menu.startSession')}
        </CtaButton>
      </div>
    );
  } else {
    body = (
      <ul className="musie-discovered">
        {data.map((track) => (
          <TrackRow
            key={track.trackId}
            track={track}
            active={sounding === track.trackId}
            onPlay={() => setSounding(track.trackId)}
          />
        ))}
      </ul>
    );
  }

  return (
    <ContentBox
      headingLevel={1}
      headlineStep="display-lg"
      headline={t('discovered.headline')}
      /* `stage`, the step the onboarding pitch uses: this is the one paragraph
         that says what the place is for. It does not hyphenate — see the
         display-step rule in musy-components.css. */
      textStep="stage"
      text={t('discovered.intro')}
    >
      {body}
    </ContentBox>
  );
}
