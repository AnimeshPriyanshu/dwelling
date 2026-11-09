/**
 * Starting map: A–C.
 *
 * Holds the four dwellings authored in Milestone 5. Their ids, contact ids and
 * collision geometry are preserved exactly as they were inline in WorldScene.
 * The contacts predate alphabet-range authoring, so they are kept here rather
 * than renamed; see the M6 daily log for the known FR-017 gap.
 *
 * @type {import('./format').MapConfig}
 */
const aC = {
  id: 'a-c',
  name: 'Alder Creek',
  range: 'A–C',
  size: { columns: 60, rows: 40 },
  groundTile: 0,
  spawn: { x: 480, y: 320 },
  dwellings: [
    {
      id: 'dwelling-redwood',
      contactId: 'contact-elowen',
      name: 'Redwood Cottage',
      contact: 'Elowen',
      role: 'Herbalist',
      x: 280,
      y: 160,
      tileFrames: [52, 53, 64, 65],
      radius: 48,
    },
    {
      id: 'dwelling-cobalt',
      contactId: 'contact-rowan',
      name: 'Cobalt Haven',
      contact: 'Rowan',
      role: 'Woodworker',
      x: 680,
      y: 160,
      tileFrames: [54, 55, 66, 67],
      radius: 48,
    },
    {
      id: 'dwelling-amber',
      contactId: 'contact-kael',
      name: 'Amber Hearth',
      contact: 'Kael',
      role: 'Blacksmith',
      x: 240,
      y: 480,
      tileFrames: [48, 49, 60, 61],
      radius: 48,
    },
    {
      id: 'dwelling-verdant',
      contactId: 'contact-lyra',
      name: 'Verdant Rest',
      contact: 'Lyra',
      role: 'Innkeeper',
      x: 720,
      y: 480,
      tileFrames: [50, 51, 62, 63],
      radius: 48,
    },
  ],
  doors: [],
  obstacles: [
    // Horizontal fence line (North-West)
    { x: 360, y: 240, frame: 80, width: 16, height: 14, offsetX: 0, offsetY: 2 },
    { x: 376, y: 240, frame: 81, width: 16, height: 14, offsetX: 0, offsetY: 2 },
    { x: 392, y: 240, frame: 81, width: 16, height: 14, offsetX: 0, offsetY: 2 },
    { x: 408, y: 240, frame: 81, width: 16, height: 14, offsetX: 0, offsetY: 2 },
    { x: 424, y: 240, frame: 82, width: 16, height: 14, offsetX: 0, offsetY: 2 },

    // Vertical fence line (North-East)
    { x: 560, y: 200, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },
    { x: 560, y: 216, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },
    { x: 560, y: 232, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },
    { x: 560, y: 248, frame: 80, width: 14, height: 16, offsetX: 1, offsetY: 0 },

    // Tree grove (South of center spawn)
    { x: 440, y: 420, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
    { x: 472, y: 420, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
    { x: 504, y: 420, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
    { x: 456, y: 444, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
    { x: 488, y: 444, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },

    // Scattered rocks and wood stumps
    { x: 380, y: 340, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
    { x: 540, y: 340, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
    { x: 480, y: 240, frame: 93, width: 12, height: 12, offsetX: 2, offsetY: 2 },
    { x: 420, y: 300, frame: 93, width: 12, height: 12, offsetX: 2, offsetY: 2 },

    // Corner and perimeter obstacles
    { x: 48, y: 48, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
    { x: 912, y: 48, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
    { x: 48, y: 592, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
    { x: 912, y: 592, frame: 106, width: 14, height: 12, offsetX: 1, offsetY: 2 },
    { x: 100, y: 320, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
    { x: 860, y: 320, frame: 115, width: 12, height: 10, offsetX: 2, offsetY: 6 },
  ],
  altar: { x: 480, y: 560 },
}

export default aC
