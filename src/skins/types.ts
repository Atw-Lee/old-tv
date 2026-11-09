import type {ReactNode} from 'react';
import type {TVSnapshot} from '../core/tv-controller.js';
export interface TVActions {
  togglePower(): void;
  nextChannel(direction: 1 | -1): void;
  selectChannel(id: string): void;
  setVolume(value: number): void;
}
/** Skin owns only presentation/transitions. The screen slot is owned by its host. */
export interface SkinProps {
  state: TVSnapshot;
  actions: TVActions;
  children: ReactNode;
}
