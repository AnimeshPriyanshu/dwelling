import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { phaserPublish } from '../bridge'

const WorldScene = () => {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 400,
      parent: containerRef.current,
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } },
      },
      scene: {
        preload: () => {
          // Load assets here
        },
        create: () => {
          // World setup
          const graphics = this.add.graphics()
          graphics.fillStyle(0x202a27)
          graphics.fillRect(0, 0, 800, 400)
          // Emit when player enters interaction zone
          phaserPublish('dwelling:near', 'dwelling-1')
        },
        update: () => {
          // Game loop
          // Check for player-dwelling interaction
          // phaserPublish('dwelling:interact', 'dwelling-1')
        },
      },
    }

    const game = new Phaser.Game(config)
    return () => {
      game.destroy(true, true)
      // Clean up bridge subscribers on unmount
      // unsubscribeAll()
    }
  }, [containerRef.current])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

export default WorldScene