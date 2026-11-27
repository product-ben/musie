/**
 * The piece, played by one `<audio>` this page owns — quick and dirty, for the
 * new listening view (Figma „Achtsame Pause · Hören · digitale Karte“, Ben,
 * 2026-11-27). The app's `useMix` lives inside `SessionListen` and drives the
 * old Sheet; this view is outside it, so it gets its own element.
 *
 * `play` is synchronous on purpose: iOS grants playback to the tap, so it is
 * called straight from the click handler that opens the view. The URL is the
 * `blob:` the audio shim has been downloading since the page loaded.
 */
import * as React from 'react';
import { signedTrackUrl } from '../../../src/lib/audio';

export interface Player {
  ready: boolean;
  playing: boolean;
  ended: boolean;
  position: number;
  play: () => void;
  pause: () => void;
}

export function usePlayer(src: string): Player {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [ready, setReady] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [ended, setEnded] = React.useState(false);
  const [position, setPosition] = React.useState(0);

  React.useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;
    const onPlay = () => { setPlaying(true); setEnded(false); };
    const onPause = () => setPlaying(false);
    const onTime = () => setPosition(audio.currentTime);
    const onEnded = () => { setPlaying(false); setEnded(true); };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    let cancelled = false;
    void signedTrackUrl(src).then((url) => {
      if (cancelled || url === null) return;
      audio.src = url;
      setReady(true);
    });
    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [src]);

  const play = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio === null || audio.src === '') return;
    if (audio.ended) audio.currentTime = 0;
    audio.play().catch((error: unknown) => {
      console.info('[vollbild] playback refused', error);
      setPlaying(false);
    });
  }, []);

  const pause = React.useCallback(() => {
    audioRef.current?.pause();
  }, []);

  return { ready, playing, ended, position, play, pause };
}
