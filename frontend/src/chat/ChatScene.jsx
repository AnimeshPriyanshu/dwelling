import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { phaserPublish } from '../bridge'

const ChatScene = () => {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const config = {
      type: Phaser.AUTO,
      width: 400,
      height: 600,
      parent: containerRef.current,
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } },
      },
      scene: {
        preload: () => {
          // Load chat assets
        },
        create: () => {
          const graphics = this.add.graphics()
          graphics.fillStyle(0xffffff)
          graphics.fillRect(0, 0, 400, 600)
          this.add.text(20, 20, 'Chat Scene', { font: '16px system-ui', fill: '#202a27' })
          // Chat scene can listen for events from other scenes
          phaserPublish('dwelling:interact', 'dwelling-1')
        },
        update: () => {
          // Chat update logic
        },
      },
    }

    const game = new Phaser.Game(config)
    return () => {
      game.destroy(true, true)
    }
  }, [containerRef.current])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

export default ChatScene