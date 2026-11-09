import type {Scheduler} from './scheduler.js';

/** Browser wiring is separate from pure scheduling so fake clocks/events remain testable. */
export function bindBrowserLifecycle(
  scheduler: Scheduler,
  page: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>,
  network: Pick<Window, 'addEventListener' | 'removeEventListener'>,
): () => void {
  const visible = () => { if (page.visibilityState === 'visible') scheduler.refresh('visible'); };
  const online = () => { scheduler.refresh('online'); };
  const pageshow = () => { scheduler.refresh('resume'); };
  page.addEventListener('visibilitychange', visible);
  network.addEventListener('online', online);
  network.addEventListener('pageshow', pageshow);
  return () => {
    page.removeEventListener('visibilitychange', visible);
    network.removeEventListener('online', online);
    network.removeEventListener('pageshow', pageshow);
  };
}
