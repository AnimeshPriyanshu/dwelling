import React, { useEffect } from 'react'
import Phaser from 'phaser'
import WorldScene from './world/WorldScene'
import ChatScene from './chat/ChatScene'

const App = () => {
  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'game-container',
      scene: [WorldScene, ChatScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
        },
      },
    }

    const game = new Phaser.Game(config)
    return () => game.destroy(true, true)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div id="game-container" style={{ width: '70%', height: '100%' }}></div>
      <div style={{ width: '30%', height: '100%', padding: '20px', background: '#fff', overflow: 'auto' }}>
        <h2>Controls & Chat</h2>
        <p>Phaser game rendered on the left, UI panel on the right.</p>
      </div>
    </div>
  )
}

export default App