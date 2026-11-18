/**
 * Second map: S–U, "Sunhollow".
 *
 * A smaller hamlet at the edge of the woods: one lane in from the west, a spur
 * up to Sunhollow Cottage, and an L-shaped back lane to Tidewood Lodge. Houses
 * are tile-aligned so each door meets the road it faces. East of Tidewood, a
 * fenced root-crop plot opens onto the back lane.
 *
 * @type {import('./format').MapConfig}
 */
import { scatterForest, scatterRocks } from './terrain'

const size = { columns: 56, rows: 35 }
const spawn = { x: 448, y: 300 }
const altar = { x: 400, y: 470 }

// Cottage centres land on tile middles: 224 = 16 × 14, 672 = 16 × 42.
const NORTH_HOUSE_X = 224
const NORTH_HOUSE_BOTTOM = 208 // row 13
const SOUTH_HOUSE_X = 672
const SOUTH_HOUSE_BOTTOM = 432 // row 27
const NORTH_HOUSE_Y = NORTH_HOUSE_BOTTOM - 56
const SOUTH_HOUSE_Y = SOUTH_HOUSE_BOTTOM - 56

const farms = [{ x: 46, y: 21, w: 7, h: 5, gate: 'south', crop: 'root' }]

const paths = [
  { x: 0, y: 17, w: 56, h: 2 }, // main lane, y 272–304
  { x: 13, y: 13, w: 2, h: 4 }, // spur up to Sunhollow Cottage, rows 13–16
  { x: 38, y: 19, w: 2, h: 8 }, // lane down the west side of Tidewood Lodge
  { x: 28, y: 27, w: 28, h: 2 }, // back lane, house doors open onto it
]

const dwellings = [
  {
    id: 'dwelling-sunhollow',
    contactId: 'contact-sable',
    name: 'Sunhollow Cottage',
    contact: 'Sable',
    role: 'Cartographer',
    x: NORTH_HOUSE_X,
    y: NORTH_HOUSE_Y,
    sprite: 'cottage-purple',
    radius: 76,
    bodyHeight: 20,
  },
  {
    id: 'dwelling-tidewood',
    contactId: 'contact-tomas',
    name: 'Tidewood Lodge',
    contact: 'Tomas',
    role: 'Fisher',
    x: SOUTH_HOUSE_X,
    y: SOUTH_HOUSE_Y,
    sprite: 'cottage-blue',
    radius: 76,
    bodyHeight: 20,
  },
]

const sU = {
  id: 's-u',
  name: 'Sunhollow',
  range: 'S–U',
  size,
  groundTile: 65,
  spawn,
  paths,
  farms,
  dwellings,
  doors: [],
  obstacles: [
    ...scatterForest({ size, paths, dwellings, spawn, altar, farms, seed: 71 }),
    ...scatterRocks({ size, paths, dwellings, spawn, altar, farms, seed: 79, count: 7 }),
  ],
  altar,
}

export default sU
