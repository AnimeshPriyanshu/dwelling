/**
 * Second map: S–U.
 *
 * Proves map switching. It is deliberately a smaller variation of the first
 * map, with two dwellings for contacts whose names start in S and T.
 *
 * @type {import('./format').MapConfig}
 */
const sU = {
  id: 's-u',
  name: 'Sunhollow',
  range: 'S–U',
  size: { columns: 56, rows: 35 },
  groundTile: 0,
  spawn: { x: 448, y: 280 },
  dwellings: [
    {
      id: 'dwelling-sunhollow',
      contactId: 'contact-sable',
      name: 'Sunhollow Cottage',
      contact: 'Sable',
      role: 'Cartographer',
      x: 240,
      y: 160,
      tileFrames: [56, 57, 68, 69],
      radius: 48,
    },
    {
      id: 'dwelling-tidewood',
      contactId: 'contact-tomas',
      name: 'Tidewood Lodge',
      contact: 'Tomas',
      role: 'Fisher',
      x: 656,
      y: 400,
      tileFrames: [58, 59, 70, 71],
      radius: 48,
    },
  ],
  doors: [],
  obstacles: [
    // Fence line west of the north dwelling
    { x: 120, y: 200, frame: 80, width: 16, height: 14, offsetX: 0, offsetY: 2 },
    { x: 136, y: 200, frame: 81, width: 16, height: 14, offsetX: 0, offsetY: 2 },
    { x: 152, y: 200, frame: 81, width: 16, height: 14, offsetX: 0, offsetY: 2 },
    { x: 168, y: 200, frame: 82, width: 16, height: 14, offsetX: 0, offsetY: 2 },

    // Fence line east of the north dwelling
    { x: 700, y: 120, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },
    { x: 700, y: 136, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },
    { x: 700, y: 152, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },
    { x: 700, y: 168, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },

    // Southern grove
    { x: 160, y: 420, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
    { x: 192, y: 420, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
    { x: 224, y: 420, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
    { x: 176, y: 444, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
    { x: 208, y: 444, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },

    // Scattered props
    { x: 300, y: 120, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
    { x: 640, y: 120, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
    { x: 400, y: 120, frame: 93, width: 12, height: 12, offsetX: 2, offsetY: 2 },
    { x: 560, y: 440, frame: 93, width: 12, height: 12, offsetX: 2, offsetY: 2 },

    // Corners
    { x: 48, y: 48, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
    { x: 848, y: 48, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
    { x: 48, y: 512, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
    { x: 848, y: 512, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
  ],
  altar: { x: 448, y: 488 },
}

export default sU
