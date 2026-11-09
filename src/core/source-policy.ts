import type {SourceType} from './model.js';
/** Product support policy derived from M0, NOT a promise that a particular URL can play. */
export interface SourcePolicy {
  seek: 'runtime' | 'initial-only';
  externalVolume: boolean;
  externalStatus: boolean;
  endedNotification: boolean;
  controls: 'app-owned' | 'platform-limited';
}
export function sourcePolicy(type: SourceType): SourcePolicy {
  if (type === 'bilibili') return {seek: 'initial-only', externalVolume: false, externalStatus: false, endedNotification: false, controls: 'platform-limited'};
  return {seek: 'runtime', externalVolume: true, externalStatus: true, endedNotification: true, controls: type === 'hls-vod' ? 'app-owned' : 'platform-limited'};
}
