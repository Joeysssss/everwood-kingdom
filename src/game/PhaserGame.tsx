import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { GameScene } from './GameScene'

export function PhaserGame({ onSceneReady }: { onSceneReady: (scene: GameScene) => void }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!host.current) return
    const scene = new GameScene(onSceneReady)
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: host.current,
      width: 1000,
      height: 600,
      backgroundColor: '#456b42',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, pixelArt: false },
      scene: [scene],
    })
    return () => game.destroy(true)
  }, [onSceneReady])

  return <div className="game-canvas" ref={host} aria-label="翡翠森林戰場" />
}
