import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createGame } from './world/game'

const MOCK_MESSAGES = [
  {
    id: 1,
    sender: 'inbound',
    text: 'Welcome to Dwelling! Pull up a chair by the hearth.',
    time: '10:42 AM',
  },
  {
    id: 2,
    sender: 'outbound',
    text: 'Thanks! The village looks wonderful today.',
    time: '10:43 AM',
  },
  {
    id: 3,
    sender: 'inbound',
    text: 'Let me know if you need any herbs or supplies for your hearth.',
    time: '10:45 AM',
  },
]

const App = () => {
  const worldRef = useRef(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [activeContact, setActiveContact] = useState({
    id: 'dwelling-1',
    name: 'Redwood Cottage',
    contact: 'Elowen',
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

  // Mount Phaser game
  useEffect(() => {
    const container = worldRef.current
    if (!container) return undefined

    const game = createGame(container)
    if (import.meta.env.DEV) {
      window.__dwellingGame = game
    }

    return () => {
      game.destroy(true, true)
      container.replaceChildren()
    }
  }, [])

  return (
    <div className="app-shell">
      {/* Floating Glass HUD */}
      <header className="floating-hud">
        <h1>Dwelling</h1>
        <span className="hud-hint">• Click a house or press E to chat</span>
      </header>

      {/* Fullscreen Game World */}
      <main id="world" ref={worldRef} className="world-mount" />

      {/* Slide-out Chat Drawer */}
      <aside className={`chat-drawer ${isChatOpen ? 'open' : ''}`} aria-hidden={!isChatOpen}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <h2>{activeContact.name}</h2>
            <div className="contact-sub">Resident: {activeContact.contact}</div>
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
          {MOCK_MESSAGES.map((msg) => (
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
