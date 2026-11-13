import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createGame } from './world/game'
import { EventType, requestMapSwitch, subscribe } from './bridge'
import { getDefaultMap, listMaps } from './world/maps'
import { AVATAR_URLS } from './world/assets'

const RESIDENT_MESSAGES = {
  'contact-elowen': [
    { id: 1, sender: 'inbound', text: 'Welcome to Redwood Cottage! Pull up a chair by the hearth.', time: '10:42 AM' },
    { id: 2, sender: 'outbound', text: 'Thanks! The herbs outside smell wonderful.', time: '10:43 AM' },
    { id: 3, sender: 'inbound', text: 'That would be the wild lavender. Take some if you need it!', time: '10:45 AM' },
  ],
  'contact-rowan': [
    { id: 1, sender: 'inbound', text: 'Greetings! Mind the woodchips on the doorstep.', time: '11:15 AM' },
    { id: 2, sender: 'outbound', text: 'Working on a new project?', time: '11:16 AM' },
    { id: 3, sender: 'inbound', text: 'Carving cedar benches for the town square. Stop by anytime!', time: '11:18 AM' },
  ],
  'contact-kael': [
    { id: 1, sender: 'inbound', text: 'The forge is glowing bright today! Keep your distance from the anvil.', time: '01:20 PM' },
    { id: 2, sender: 'outbound', text: 'Do you have any reinforced nails for fence repairs?', time: '01:22 PM' },
    { id: 3, sender: 'inbound', text: 'Plenty in the barrel out back. Take what you need.', time: '01:24 PM' },
  ],
  'contact-lyra': [
    { id: 1, sender: 'inbound', text: 'Welcome traveler! Come warm your hands by the stove.', time: '02:05 PM' },
    { id: 2, sender: 'outbound', text: 'Do you have hot spiced cider ready?', time: '02:07 PM' },
    { id: 3, sender: 'inbound', text: 'A fresh kettle is simmering right now. Have a seat!', time: '02:08 PM' },
  ],
  'contact-sable': [
    { id: 1, sender: 'inbound', text: 'Welcome to Sunhollow! Mind the tide charts on the table.', time: '09:10 AM' },
    { id: 2, sender: 'outbound', text: 'Did you chart the southern shoals yet?', time: '09:12 AM' },
    { id: 3, sender: 'inbound', text: 'Only the near side. The far side needs a calm morning.', time: '09:14 AM' },
  ],
  'contact-tomas': [
    { id: 1, sender: 'inbound', text: 'The tide is turning — the nets are already out.', time: '06:40 AM' },
    { id: 2, sender: 'outbound', text: 'Any luck with the silver catch?', time: '06:42 AM' },
    { id: 3, sender: 'inbound', text: 'Two baskets full. Come by the lodge and I will show you.', time: '06:44 AM' },
  ],
}

const DEFAULT_MESSAGES = [
  { id: 1, sender: 'inbound', text: 'Welcome to our dwelling! Make yourself at home.', time: '10:00 AM' },
]

// Contact portraits composited from the supplied Sunnyside character pack.
// Paths live in `world/assets.js`; this map only picks the portrait per contact.
const CONTACT_AVATARS = {
  'contact-elowen': AVATAR_URLS.curlyhair,
  'contact-rowan': AVATAR_URLS.longhair,
  'contact-kael': AVATAR_URLS.mophair,
  'contact-lyra': AVATAR_URLS.bowlhair,
  'contact-sable': AVATAR_URLS.shorthair,
  'contact-tomas': AVATAR_URLS.spikeyhair,
}
const DEFAULT_AVATAR = AVATAR_URLS.base

const App = () => {
  const worldRef = useRef(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [activeContact, setActiveContact] = useState({
    id: 'dwelling-redwood',
    contactId: 'contact-elowen',
    name: 'Redwood Cottage',
    contact: 'Elowen',
    role: 'Herbalist',
  })
  const [activeMap, setActiveMap] = useState(() => {
    const map = getDefaultMap()
    return map
      ? { id: map.id, name: map.name, range: map.range }
      : { id: '', name: 'No map', range: '' }
  })

  // Close chat handler
  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false)
    // Refocus canvas so player controls respond immediately
    const canvas = worldRef.current?.querySelector('canvas')
    if (canvas) canvas.focus()
  }, [])

  // Listen for dwelling interaction events from Phaser
  useEffect(() => {
    const onOpenChat = (event) => {
      if (event.detail) {
        setActiveContact(event.detail)
      }
      setIsChatOpen(true)
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseChat()
      }
    }

    window.addEventListener('dwelling:open-chat', onOpenChat)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('dwelling:open-chat', onOpenChat)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [handleCloseChat])

  // Keep the HUD in sync with the world's active map (Phaser → bridge → React).
  useEffect(() => {
    const unsubscribe = subscribe(EventType.MAP_CHANGED, (event) => {
      if (!event || !event.map) return
      setActiveMap(event.map)
      // A conversation belongs to the map it was opened on; never leave a
      // stale contact drawer open after the world has changed underneath it.
      setIsChatOpen(false)
    })

    return unsubscribe
  }, [])

  // Map selection is a UI request; Phaser owns the active map and confirms it
  // back through `map:changed`, which is what updates the HUD.
  const handleMapChange = useCallback((event) => {
    const mapId = event.target.value
    setIsChatOpen(false)
    requestMapSwitch(mapId)
    event.target.blur()
  }, [])

  // Mount Phaser game
  useEffect(() => {
    const container = worldRef.current
    if (!container) return undefined

    const game = createGame(container)
    if (import.meta.env.DEV) {
      window.__dwellingGame = game
    }

    return () => {
      // `noReturn` must stay false: passing `true` destroys Phaser's global
      // core-plugin cache, so the next game created on this page cannot boot
      // (React StrictMode remounts this effect in development).
      game.destroy(true)
      container.replaceChildren()
    }
  }, [])

  const currentMessages = RESIDENT_MESSAGES[activeContact.contactId] || DEFAULT_MESSAGES

  return (
    <div className="app-shell">
      {/* Floating Glass HUD */}
      <header className="floating-hud">
        <h1>Dwelling</h1>
        <div className="hud-map" aria-live="polite">
          <span className="hud-map-name">{activeMap.name}</span>
          <span aria-hidden="true">·</span>
          <span className="hud-map-range">{activeMap.range}</span>
        </div>
        <label className="map-picker">
          <span>Map</span>
          <select value={activeMap.id} onChange={handleMapChange} aria-label="Switch map">
            {listMaps().map((map) => (
              <option key={map.id} value={map.id}>
                {map.name} ({map.range})
              </option>
            ))}
          </select>
        </label>
        <span className="hud-hint">• Press E near a house to chat</span>
      </header>

      {/* Fullscreen Game World */}
      <main id="world" ref={worldRef} className="world-mount" />

      {/* Slide-out Chat Drawer */}
      <aside className={`chat-drawer ${isChatOpen ? 'open' : ''}`} aria-hidden={!isChatOpen}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <img
              className="contact-avatar"
              src={CONTACT_AVATARS[activeContact.contactId] || DEFAULT_AVATAR}
              alt=""
              aria-hidden="true"
            />
            <div className="drawer-heading">
              <h2>{activeContact.name}</h2>
              <div className="contact-sub">
                Resident: {activeContact.contact} ({activeContact.role || 'Resident'})
              </div>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={handleCloseChat}
            aria-label="Close conversation"
          >
            ✕
          </button>
        </div>

        {/* Explicit Mock Data Badge per FR-033 */}
        <div className="mock-notice-badge">
          Mock data — live messaging arrives in a later milestone
        </div>

        {/* Message Feed */}
        <div className="drawer-messages">
          {currentMessages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
              <div className="bubble-text">{msg.text}</div>
              <span className="timestamp">{msg.time}</span>
            </div>
          ))}
        </div>

        {/* Mock Input Area */}
        <div className="drawer-footer">
          <div className="input-container">
            <input
              type="text"
              className="mock-input"
              placeholder="Messaging not implemented yet..."
              disabled
            />
            <button type="button" className="mock-send-btn" disabled>
              Send
            </button>
          </div>
          <div className="input-disclaimer">Press Esc or ✕ to return to the world</div>
        </div>
      </aside>
    </div>
  )
}

export default App
