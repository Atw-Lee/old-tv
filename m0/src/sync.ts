// M0 HLS experiment: re-check the clock after buffering, not just metadata.
export function observeClockSync(
  video: HTMLVideoElement,
  target: () => { active: boolean; offset: number } | null,
  report: (event: string, data: Record<string, unknown>) => void,
  status: (value: string) => void,
  exhausted: () => void,
) {
  let disposed = false;
  let lastSeek = -Infinity;
  let lastSample = -Infinity;
  let attempts: number[] = [];
  let recovering = true;
  const check = () => {
    if (disposed) return;
    const slot = target();
    if (!slot || video.readyState === 0) return;
    if (!slot.active || (Number.isFinite(video.duration) && slot.offset >= video.duration)) {
      exhausted();
      return;
    }
    // Wait for actual decoded data. Seeking during every waiting event would
    // keep replacing the segment the player is still trying to download.
    // A policy-blocked/paused player must retain its user-gesture recovery state.
    if (video.paused || video.seeking || video.readyState < 3) return;
    const now = performance.now();
    const drift = slot.offset - video.currentTime;
    if (now - lastSample >= 1000) {
      report('sync-sample', { expected: slot.offset, actual: video.currentTime, drift,
        paused: video.paused, readyState: video.readyState, seeking: video.seeking });
      lastSample = now;
    }
    if (Math.abs(drift) > 0.5) {
      recovering = true;
      status('SYNCHRONIZING');
      attempts = attempts.filter(t => now - t < 10000);
      // Bound re-seeks under a persistently slow connection: max 3 per 10s,
      // at least 1s apart. The 250ms observer will retry after the cooldown.
      if (now - lastSeek < 1000 || attempts.length >= 3) return;
      attempts.push(now);
      lastSeek = now;
      report('sync-correction', { expected: slot.offset, actual: video.currentTime, drift, attempt: attempts.length });
      video.currentTime = slot.offset;
    } else if (!video.paused) {
      if (recovering) report('sync-settled', { expected: slot.offset, actual: video.currentTime, drift });
      recovering = false;
      status('PLAYING');
    }
  };
  const waiting = () => {
    if (disposed || !target()) return;
    recovering = true;
    status('BUFFERING');
  };
  const readyEvents = ['seeked', 'canplay', 'playing'] as const;
  readyEvents.forEach(e => video.addEventListener(e, check));
  video.addEventListener('waiting', waiting);
  const timer = window.setInterval(check, 250);
  return () => {
    disposed = true;
    window.clearInterval(timer);
    readyEvents.forEach(e => video.removeEventListener(e, check));
    video.removeEventListener('waiting', waiting);
  };
}
