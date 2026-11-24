import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_REAL_SECONDS = 10; // long flights are fast-forwarded to fit in ~10 s at 1x

/**
 * requestAnimationFrame playback clock. `t` is simulation time in seconds.
 * Users who prefer reduced motion get the finished trajectory immediately.
 */
export function usePlayback() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const s = useRef({ t: 0, duration: 0, rate: 1, speed: 1, playing: false, last: 0, raf: 0, onEnd: null });

  const loop = useCallback((now) => {
    const st = s.current;
    if (!st.playing) return;
    const dt = Math.min(0.05, (now - st.last) / 1000);
    st.last = now;
    st.t += dt * st.rate * st.speed;
    if (st.t >= st.duration) {
      st.t = st.duration;
      st.playing = false;
      setT(st.t);
      setPlaying(false);
      st.onEnd?.();
      return;
    }
    setT(st.t);
    st.raf = requestAnimationFrame(loop);
  }, []);

  const run = useCallback(() => {
    const st = s.current;
    st.playing = true;
    st.last = performance.now();
    setPlaying(true);
    cancelAnimationFrame(st.raf);
    st.raf = requestAnimationFrame(loop);
  }, [loop]);

  const start = useCallback(
    (duration, onEnd) => {
      const st = s.current;
      cancelAnimationFrame(st.raf);
      st.duration = duration;
      st.rate = Math.max(1, duration / MAX_REAL_SECONDS);
      st.onEnd = onEnd;
      st.t = 0;
      setT(0);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduce || duration <= 0) {
        st.t = duration;
        st.playing = false;
        setT(duration);
        setPlaying(false);
        onEnd?.();
        return;
      }
      run();
    },
    [run],
  );

  const pause = useCallback(() => {
    s.current.playing = false;
    cancelAnimationFrame(s.current.raf);
    setPlaying(false);
  }, []);

  const resume = useCallback(() => {
    const st = s.current;
    if (st.t < st.duration) run();
  }, [run]);

  const reset = useCallback(() => {
    const st = s.current;
    cancelAnimationFrame(st.raf);
    st.playing = false;
    st.t = 0;
    setT(0);
    setPlaying(false);
  }, []);

  const setSpeed = useCallback((v) => {
    s.current.speed = v;
  }, []);

  useEffect(() => () => cancelAnimationFrame(s.current.raf), []);

  return { t, playing, start, pause, resume, reset, setSpeed, rate: s.current.rate };
}
