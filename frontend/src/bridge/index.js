// Minimal DOM bridge between React UI and Phaser game world.
// Rules (ADR-0005):
// - Scenes may emit; they must not import UI modules.
// - UI modules may subscribe; they must not import scenes.
// - Event payloads are plain data (ids, names) — never sprites, scenes, or DOM nodes.
// - The bridge contains no game logic and no network calls.

// Event types shared between Phaser and React
export const EventType = {
  // Phaser → React
  DWELLING_NEAR: 'dwelling:near',
  DWELLING_INTERACT: 'dwelling:interact',
  PLAYER_MOVE: 'player:move',
  MAP_CHANGED: 'map:changed',

  // React → Phaser
  PLAYER_INPUT: 'player:input',
  UI_ACTION: 'ui:action',
  UI_STATE: 'ui:state',
  MAP_SWITCH: 'map:switch',
}

// Phaser event names creators
export const phaserEvents = {
  dwellingNear: (dwellingId) => ({ type: EventType.DWELLING_NEAR, dwellingId }),
  dwellingInteract: (dwelling) => ({
    type: EventType.DWELLING_INTERACT,
    dwelling,
  }),
  playerMove: (dx, dy) => ({ type: EventType.PLAYER_MOVE, dx, dy }),
  mapChanged: (map) => ({
    type: EventType.MAP_CHANGED,
    map: { id: map.id, name: map.name, range: map.range },
  }),
}

// React event names creators
export const reactEvents = {
  setPlayerPosition: (x, y) => ({ type: 'set-player-position', x, y }),
  toggleChat: () => ({ type: 'toggle-chat' }),
  switchMap: (mapId) => ({ type: EventType.MAP_SWITCH, mapId }),
}

// Subscription map for the bridge
const subscribers = {}

// Subscribe to a topic with a handler
export function subscribe(topic, handler) {
  if (!subscribers[topic]) {
    subscribers[topic] = []
  }
  subscribers[topic].push(handler)
  return () => {
    subscribers[topic] = subscribers[topic].filter(h => h !== handler)
  }
}

// Publish an event to all subscribers of a topic
export function publish(topic, payload) {
  const handlers = subscribers[topic]
  if (handlers) {
    for (const handler of handlers) {
      handler(payload)
    }
  }
}

// UI → Phaser helper. Keeps React modules away from the event shape.
export function requestMapSwitch(mapId) {
  publish(EventType.MAP_SWITCH, { mapId })
}

// UI → Phaser helper. Tells the world whether a DOM panel owns the input.
export function setChatOpen(open) {
  publish(EventType.UI_STATE, { chatOpen: Boolean(open) })
}

// Unsubscribe all listeners for a topic (or all topics)
export function unsubscribeAll(topic) {
  if (topic) {
    delete subscribers[topic]
  } else {
    Object.keys(subscribers).forEach(key => delete subscribers[key])
  }
}

// Helper for Phaser scenes to publish events through the bridge
export function phaserPublish(topic, ...args) {
  const event = phaserEvents[topic] ? phaserEvents[topic](...args) : { type: topic, ...args[0] }
  publish(event.type, event)
}

// Export defaults for convenience
export default {
  EventType,
  phaserEvents,
  reactEvents,
  phaserPublish,
  requestMapSwitch,
  setChatOpen,
  subscribe,
  publish,
  unsubscribeAll,
}
