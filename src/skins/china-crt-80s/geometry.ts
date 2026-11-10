import type {IllustratedSkin} from '../illustrated/layout.js';

// Coordinates in the original painting, before viewport scaling.
const side = {
  width: 1536, height: 1024, asset: 'skins/painted-room/scene.webp',
  frame: [193, 60, 1310, 826],
  screen: [279, 186, 675, 557],
  screenPath: 'M341 4 C224 4 104 10 57 34 C33 46 27 65 20 105 C8 168 5 238 5 302 C5 382 10 453 22 497 C28 521 40 532 69 538 C135 550 239 553 341 553 C459 553 574 550 628 535 C650 529 657 514 662 482 C670 434 673 356 673 291 C673 209 667 129 655 80 C649 52 638 38 613 28 C567 10 447 4 341 4 Z',
  channel: [1093, 283, 110], volume: [1091, 429, 40], volumeArc: [-89, 89],
  clockArt: {bounds:[1230,48,290,280], ellipse:[142,137,112,116], wallStripWidth:30},
  clock: [1373, 184, 104], power: [1076, 727, 64, 38],
  settings: [1014, 730, 50, 32],
} as const;
const stacked = {
  width: 1024, height: 1536, asset: 'skins/painted-room/stacked.webp',
  frame: [44, 52, 942, 1240],
  screen: [140, 414, 742, 550],
  screenPath: 'M372 4 C246 4 109 10 62 32 C34 44 25 65 18 107 C6 173 5 245 5 307 C5 383 8 451 20 488 C27 512 37 522 65 529 C124 543 257 547 372 547 C502 547 623 544 679 530 C708 523 720 509 728 479 C738 431 741 356 741 291 C741 210 737 140 727 88 C721 57 709 39 682 28 C636 10 505 4 372 4 Z',
  channel: [208, 1080, 98], volume: [348, 1081, 44], volumeArc: [-72, 72],
  clockArt: {bounds:[718,36,284,284], ellipse:[138,135,119,121], wallStripWidth:32},
  clock: [856, 172, 103], power: [821, 1048, 60, 44],
  settings: [750, 1050, 57, 40],
} as const;

export const paintedRoom = {side,stacked} satisfies IllustratedSkin;
