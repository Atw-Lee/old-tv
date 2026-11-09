import type {IllustratedSkin} from '../illustrated/layout.js';

const screenRadius='16% 15% 11% 12% / 18% 19% 14% 17%';
// Coordinates in the original painting, before viewport scaling.
const side = {
  width: 1536, height: 1024, asset: 'skins/painted-room/scene.webp',
  frame: [193, 60, 1310, 826], screenRadius,
  screen: [279, 186, 675, 557],
  channel: [1093, 283, 110], volume: [1091, 429, 40], volumeArc: [-89, 89],
  clock: [1373, 184, 104], power: [1076, 727, 64, 38],
  settings: [1014, 730, 50, 32],
} as const;
const stacked = {
  width: 1024, height: 1536, asset: 'skins/painted-room/stacked.webp',
  frame: [44, 52, 942, 1240], screenRadius,
  screen: [140, 414, 742, 550],
  channel: [208, 1080, 98], volume: [348, 1081, 44], volumeArc: [-72, 72],
  clock: [856, 172, 103], power: [821, 1048, 60, 44],
  settings: [750, 1050, 57, 40],
} as const;

export const paintedRoom = {side,stacked} satisfies IllustratedSkin;
