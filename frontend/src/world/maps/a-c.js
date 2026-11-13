/**
 * Starting map: A–C, "Alder Creek".
 *
 * A crossroads village: one east–west street, one north–south lane, and short
 * spurs to each cottage door. Houses sit on tile-aligned positions, so every
 * spur is centred on the door it serves. A fenced wheat plot sits in the east
 * meadow, its gate lining up with a threshold off the street.
 *
 * Ground is Sunnyside grass; paths are the supplied Sprout Lands dirt tiles;
 * dwellings, trees and rocks are the supplied sprites. Dwelling ids and contact
 * ids are unchanged from Milestone 5 so interactions stay stable.
 *
 * @type {import('./format').MapConfig}
 */
import { scatterForest, scatterRocks } from './terrain'

const size = { columns: 60, rows: 40 }
const spawn = { x: 480, y: 340 }
const altar = { x: 520, y: 560 }

// Cottages are 64×112 (2× the 32×56 crop). A centre of 224 or 736 lines the
// door up with the middle of a two-tile spur: 224 = 16 × 14, 736 = 16 × 46.
const WEST_HOUSE_X = 224
const EAST_HOUSE_X = 736
const NORTH_HOUSE_BOTTOM = 240 // row 15
const SOUTH_HOUSE_BOTTOM = 496 // row 31
const NORTH_HOUSE_Y = NORTH_HOUSE_BOTTOM - 56
const SOUTH_HOUSE_Y = SOUTH_HOUSE_BOTTOM - 56

// A wheat plot in the east meadow, fenced, with its gate facing the street.
const farms = [{ x: 36, y: 22, w: 8, h: 6, gate: 'north', crop: 'wheat' }]

const paths = [
  // Village crossroads, all on whole tiles
  { x: 0, y: 19, w: 60, h: 2 }, // main street, y 304–336
  { x: 29, y: 0, w: 2, h: 40 }, // cross street, x 464–496
  // Spurs from the street up to the north doors (rows 15–18)
  { x: 13, y: 15, w: 2, h: 4 },
  { x: 45, y: 15, w: 2, h: 4 },
  // Back lane along the south cottages (rows 33–34) and their spurs (31–32)
  { x: 8, y: 33, w: 44, h: 2 },
  { x: 13, y: 31, w: 2, h: 2 },
  { x: 45, y: 31, w: 2, h: 2 },
  // Threshold from the street to the farm gate (the gate is at cols 39–40)
  { x: 39, y: 21, w: 2, h: 1 },
]

const dwellings = [
  {
    id: 'dwelling-redwood',
    contactId: 'contact-elowen',
    name: 'Redwood Cottage',
    contact: 'Elowen',
    role: 'Herbalist',
    x: WEST_HOUSE_X,
    y: NORTH_HOUSE_Y,
    sprite: 'cottage-blue',
    radius: 76,
    bodyHeight: 20,
  },
  {
    id: 'dwelling-cobalt',
    contactId: 'contact-rowan',
    name: 'Cobalt Haven',
    contact: 'Rowan',
    role: 'Woodworker',
    x: EAST_HOUSE_X,
    y: NORTH_HOUSE_Y,
    sprite: 'cottage-green',
    radius: 76,
    bodyHeight: 20,
  },
  {
    id: 'dwelling-amber',
    contactId: 'contact-kael',
    name: 'Amber Hearth',
    contact: 'Kael',
    role: 'Blacksmith',
    x: WEST_HOUSE_X,
    y: SOUTH_HOUSE_Y,
    sprite: 'cottage-orange',
    radius: 76,
    bodyHeight: 20,
  },
  {
    id: 'dwelling-verdant',
    contactId: 'contact-lyra',
    name: 'Verdant Rest',
    contact: 'Lyra',
    role: 'Innkeeper',
    x: EAST_HOUSE_X,
    y: SOUTH_HOUSE_Y,
    sprite: 'cottage-red',
    radius: 76,
    bodyHeight: 20,
  },
]

const aC = {
  id: 'a-c',
  name: 'Alder Creek',
  range: 'A–C',
  size,
  groundTile: 65,
  spawn,
  paths,
  farms,
  dwellings,
  doors: [],
  obstacles: [
    ...scatterForest({ size, paths, dwellings, spawn, altar, farms, seed: 19 }),
    ...scatterRocks({ size, paths, dwellings, spawn, altar, farms, seed: 23, count: 8 }),
  ],
  altar,
}

export default aC
