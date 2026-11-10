import Phaser from 'phaser'
import { ENEMIES, PATH, TOWER_SLOTS, TOWERS } from './types'
import type { EnemyType } from './types'
import { useGameStore } from './gameStore'
import { playSound } from './audio'

interface Enemy {
  id: number
  type: EnemyType
  x: number
  y: number
  pathIndex: number
  health: number
  maxHealth: number
  progress: number
}

interface Projectile {
  x: number
  y: number
  tx: number
  ty: number
  life: number
  color: number
}

interface Reinforcement {
  x: number
  y: number
  life: number
  attack: number
}

const W = 1000
const H = 600

export class GameScene extends Phaser.Scene {
  private terrain!: Phaser.GameObjects.Graphics
  private actors!: Phaser.GameObjects.Graphics
  private readonly onSceneReady: (scene: GameScene) => void
  private enemies: Enemy[] = []
  private projectiles: Projectile[] = []
  private reinforcements: Reinforcement[] = []
  private hero = { x: 850, y: 340, targetX: 850, targetY: 340, attack: 0 }
  private spawnQueue: EnemyType[] = []
  private spawnTimer = 0
  private enemyId = 0
  private lastRunId = -1
  private lastSkillId = 0
  private waveNumber = 0
  private towerTimers = new Map<string, number>()

  constructor(onSceneReady: (scene: GameScene) => void) {
    super('GameScene')
    this.onSceneReady = onSceneReady
  }

  create() {
    this.terrain = this.add.graphics()
    this.actors = this.add.graphics()
    this.drawTerrain()
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (useGameStore.getState().phase !== 'playing') return
      const { x, y } = pointer
      const state = useGameStore.getState()
      if (state.buildType) {
        const index = TOWER_SLOTS.findIndex((slot) => Phaser.Math.Distance.Between(slot.x, slot.y, x, y) < 34)
        if (index >= 0) {
          if (state.towers.some((tower) => tower.slot === index)) {
            useGameStore.getState().selectTower(state.towers.find((tower) => tower.slot === index)!.id)
          } else if (state.gold >= TOWERS[state.buildType].cost) {
            playSound('build')
            useGameStore.getState().addTower({
              id: `tower-${Date.now()}-${index}`, type: state.buildType, level: 1, slot: index, invested: TOWERS[state.buildType].cost,
            })
          }
          return
        }
      }
      const tower = state.towers.find((item) => {
        const slot = TOWER_SLOTS[item.slot]
        return Phaser.Math.Distance.Between(slot.x, slot.y, x, y) < 34
      })
      if (tower) {
        useGameStore.getState().selectTower(tower.id)
        return
      }
      useGameStore.getState().selectTower(null)
      this.hero.targetX = Phaser.Math.Clamp(x, 24, 960)
      this.hero.targetY = Phaser.Math.Clamp(y, 48, 555)
    })
    this.onSceneReady(this)
  }

  private drawTerrain() {
    const g = this.terrain
    g.fillStyle(0x456b42).fillRect(0, 0, W, H)
    g.fillStyle(0x54794a, 0.5).fillEllipse(90, 160, 370, 250)
    g.fillStyle(0x375d3e, 0.42).fillEllipse(490, 90, 430, 250)
    g.fillStyle(0x65854b, 0.55).fillEllipse(840, 500, 460, 220)
    for (let i = 0; i < 92; i++) {
      const x = (i * 197 + 31) % W
      const y = (i * 113 + 67) % H
      if (this.nearPath(x, y, 50)) continue
      const r = 9 + ((i * 13) % 17)
      g.fillStyle(i % 3 === 0 ? 0x294a35 : i % 3 === 1 ? 0x365a3c : 0x426b43, 0.85)
      g.fillCircle(x, y, r)
      g.fillStyle(0xa6a964, 0.28).fillCircle(x - r * 0.24, y - r * 0.32, r * 0.38)
      g.fillStyle(0x574832).fillRect(x - 2, y + r * 0.55, 4, r * 0.65)
    }
    g.lineStyle(50, 0x604e39, 1)
    g.beginPath().moveTo(PATH[0].x, PATH[0].y)
    PATH.slice(1).forEach(({ x, y }) => g.lineTo(x, y))
    g.strokePath()
    g.lineStyle(39, 0xc9a96f, 1)
    g.beginPath().moveTo(PATH[0].x, PATH[0].y)
    PATH.slice(1).forEach(({ x, y }) => g.lineTo(x, y))
    g.strokePath()
    g.lineStyle(1.5, 0xe9d39a, 0.6)
    g.beginPath().moveTo(PATH[0].x, PATH[0].y)
    PATH.slice(1).forEach(({ x, y }) => g.lineTo(x, y))
    g.strokePath()
    for (let x = 26; x < 930; x += 38) {
      for (let y = 24; y < 570; y += 42) {
        if (!this.nearPath(x, y, 54)) {
          g.fillStyle(0xd6c37c, 0.56).fillCircle(x + ((x + y) % 9), y, 1.5)
        }
      }
    }
    this.drawCastle(g)
    this.add.text(18, 464, '敵軍入口', { fontFamily: 'serif', fontSize: '13px', color: '#f5e8bd', stroke: '#273324', strokeThickness: 3 }).setDepth(2)
    this.add.text(868, 68, '翡翠城堡', { fontFamily: 'serif', fontSize: '14px', color: '#fff0c1', stroke: '#273324', strokeThickness: 3 }).setDepth(2)
    TOWER_SLOTS.forEach((slot, i) => {
      g.fillStyle(0x1d342a, 0.34).fillEllipse(slot.x, slot.y + 13, 47, 21)
      g.fillStyle(0xf4dd9e, 0.88).fillCircle(slot.x, slot.y, 20)
      g.lineStyle(2, 0x72583b, 0.92).strokeCircle(slot.x, slot.y, 20)
      g.fillStyle(0xffffff, 0.55).fillCircle(slot.x - 7, slot.y - 7, 3)
      this.add.text(slot.x, slot.y + 1, '+', { fontFamily: 'sans-serif', fontSize: '20px', color: '#715b3d', fontStyle: 'bold' })
        .setOrigin(0.5).setDepth(2).setName(`slot-${i}`)
    })
  }

  private drawCastle(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x1c342a, 0.35).fillEllipse(935, 117, 118, 85)
    g.fillStyle(0xc5c6b8).fillRect(887, 83, 87, 67)
    g.fillStyle(0xe2ddc7).fillRect(899, 93, 65, 57)
    g.fillStyle(0xb8bead).fillRect(881, 66, 24, 84)
    g.fillStyle(0xcbd0be).fillRect(954, 62, 24, 88)
    g.fillStyle(0x735a48).fillTriangle(878, 66, 893, 45, 908, 66)
    g.fillStyle(0x735a48).fillTriangle(951, 62, 966, 40, 981, 62)
    g.fillStyle(0x7e543c).fillRect(925, 118, 20, 32)
    g.fillStyle(0x7c9a8b).fillRect(900, 108, 11, 14)
    g.fillStyle(0x7c9a8b).fillRect(949, 108, 11, 14)
    g.fillStyle(0xc94f42).fillTriangle(900, 37, 900, 58, 923, 53)
    g.fillStyle(0xe7d59b).fillRect(900, 53, 2, 16)
    g.fillStyle(0xc94f42).fillTriangle(966, 32, 966, 54, 986, 48)
    g.fillStyle(0xe7d59b).fillRect(966, 48, 2, 17)
  }

  private nearPath(x: number, y: number, distance: number) {
    return PATH.slice(0, -1).some((start, index) => {
      const end = PATH[index + 1]
      const dx = end.x - start.x
      const dy = end.y - start.y
      const length = dx * dx + dy * dy
      const t = Phaser.Math.Clamp(((x - start.x) * dx + (y - start.y) * dy) / length, 0, 1)
      return Phaser.Math.Distance.Between(x, y, start.x + t * dx, start.y + t * dy) < distance
    })
  }

  update(_time: number, delta: number) {
    const state = useGameStore.getState()
    if (state.runId !== this.lastRunId) this.resetRun(state.runId)
    if (state.phase !== 'playing' || state.paused) {
      this.drawActors()
      return
    }
    const factor = state.speed
    const dt = Math.min(delta / 1000, 0.06) * factor
    this.updateSkill(state.skillEvent)
    this.spawnTimer -= dt
    if (this.spawnQueue.length && this.spawnTimer <= 0) {
      this.spawnEnemy(this.spawnQueue.shift()!)
      this.spawnTimer = 0.9 / factor
      if (!this.spawnQueue.length) useGameStore.getState().setHud({ waveSpawning: false })
    }
    this.updateEnemies(dt)
    this.updateTowers(dt)
    this.updateHero(dt)
    this.updateReinforcements(dt)
    this.updateProjectiles(dt)
    if (this.waveNumber === 20 && this.spawnQueue.length === 0 && this.enemies.length === 0 && useGameStore.getState().phase === 'playing') {
      useGameStore.getState().setPhase('won')
    }
    this.drawActors()
  }

  private resetRun(runId: number) {
    this.lastRunId = runId
    this.lastSkillId = 0
    this.enemies = []
    this.projectiles = []
    this.reinforcements = []
    this.spawnQueue = []
    this.waveNumber = 0
    this.towerTimers.clear()
    this.hero = { x: 850, y: 340, targetX: 850, targetY: 340, attack: 0 }
    useGameStore.getState().setHud({ health: 20, gold: 250, wave: 0, kills: 0, waveSpawning: false })
  }

  startWave() {
    const state = useGameStore.getState()
    if (state.phase !== 'playing' || state.paused || state.waveSpawning || this.waveNumber >= 20) return
    if (this.waveNumber > 0 && this.enemies.length > 0) {
      useGameStore.setState((current) => ({ gold: current.gold + 20 }))
    }
    this.waveNumber++
    const count = this.waveNumber === 20 ? 7 : 5 + this.waveNumber
    this.spawnQueue = Array.from({ length: count }, (_, index) => this.enemyForWave(this.waveNumber, index, count))
    this.spawnTimer = 0
    useGameStore.getState().setHud({ wave: this.waveNumber, waveSpawning: true })
  }

  private enemyForWave(wave: number, index: number, count: number): EnemyType {
    if (wave === 20 && index === count - 1) return 'boss'
    if (wave < 3) return index % 4 === 3 ? 'orc' : 'goblin'
    if (wave < 7) return index % 4 === 0 ? 'wolf' : index % 3 === 0 ? 'orc' : 'goblin'
    if (wave < 12) return index % 4 === 0 ? 'knight' : index % 3 === 0 ? 'wolf' : 'orc'
    return index % 5 === 0 ? 'demon' : index % 3 === 0 ? 'knight' : 'orc'
  }

  private spawnEnemy(type: EnemyType) {
    const definition = ENEMIES[type]
    const multiplier = 1 + this.waveNumber * 0.12
    this.enemies.push({
      id: this.enemyId++, type, x: PATH[0].x, y: PATH[0].y,
      pathIndex: 0, health: definition.health * multiplier, maxHealth: definition.health * multiplier, progress: 0,
    })
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      const definition = ENEMIES[enemy.type]
      enemy.progress += definition.speed * (enemy.type === 'demon' ? 1.12 : 1) * dt
      while (enemy.pathIndex < PATH.length - 1) {
        const from = PATH[enemy.pathIndex]
        const to = PATH[enemy.pathIndex + 1]
        const segment = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
        if (enemy.progress < segment) {
          const ratio = enemy.progress / segment
          enemy.x = Phaser.Math.Linear(from.x, to.x, ratio)
          enemy.y = Phaser.Math.Linear(from.y, to.y, ratio)
          break
        }
        enemy.progress -= segment
        enemy.pathIndex++
        if (enemy.pathIndex === PATH.length - 1) {
          this.enemies.splice(i, 1)
          const currentHealth = useGameStore.getState().health
          const damage = enemy.type === 'boss' ? 5 : 1
          useGameStore.getState().setHud({ health: Math.max(0, currentHealth - damage) })
          if (currentHealth <= damage) useGameStore.getState().setPhase('lost')
          break
        }
      }
    }
  }

  private updateTowers(dt: number) {
    const { towers } = useGameStore.getState()
    for (const tower of towers) {
      const slot = TOWER_SLOTS[tower.slot]
      const definition = TOWERS[tower.type]
      const levelBoost = 1 + (tower.level - 1) * 0.65
      const range = definition.range + (tower.level - 1) * 10
      const elapsed = (this.towerTimers.get(tower.id) ?? 0) - dt
      if (elapsed > 0) {
        this.towerTimers.set(tower.id, elapsed)
        continue
      }
      const target = this.enemies
        .filter((enemy) => Phaser.Math.Distance.Between(slot.x, slot.y, enemy.x, enemy.y) <= range)
        .sort((a, b) => b.pathIndex * 1000 + b.progress - (a.pathIndex * 1000 + a.progress))[0]
      if (!target) continue
      const damage = definition.damage * levelBoost
      target.health -= tower.type === 'mage' ? damage : damage * (1 - ENEMIES[target.type].armor)
      this.towerTimers.set(tower.id, definition.attackRate / levelBoost)
      this.projectiles.push({ x: slot.x, y: slot.y, tx: target.x, ty: target.y, life: 0.18, color: definition.color })
      playSound('attack')
      if (tower.type === 'cannon') {
        this.enemies.forEach((enemy) => {
          if (enemy !== target && Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y) < 48) enemy.health -= damage * 0.55
        })
      }
      this.removeDefeated()
    }
  }

  private updateHero(dt: number) {
    const distance = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, this.hero.targetX, this.hero.targetY)
    if (distance > 4) {
      const step = Math.min(distance, 155 * dt)
      this.hero.x += (this.hero.targetX - this.hero.x) / distance * step
      this.hero.y += (this.hero.targetY - this.hero.y) / distance * step
    }
    this.hero.attack -= dt
    if (this.hero.attack <= 0) {
      const enemy = this.enemies
        .filter((item) => Phaser.Math.Distance.Between(this.hero.x, this.hero.y, item.x, item.y) < 76)
        .sort((a, b) => b.progress - a.progress)[0]
      if (enemy) {
        enemy.health -= 38
        this.projectiles.push({ x: this.hero.x, y: this.hero.y, tx: enemy.x, ty: enemy.y, life: 0.14, color: 0xffe185 })
        this.hero.attack = 0.72
        this.removeDefeated()
      }
    }
  }

  private updateReinforcements(dt: number) {
    for (const soldier of this.reinforcements) {
      soldier.life -= dt
      soldier.attack -= dt
      const target = this.enemies
        .filter((enemy) => Phaser.Math.Distance.Between(soldier.x, soldier.y, enemy.x, enemy.y) < 190)
        .sort((a, b) => Phaser.Math.Distance.Between(soldier.x, soldier.y, a.x, a.y) - Phaser.Math.Distance.Between(soldier.x, soldier.y, b.x, b.y))[0]
      if (!target) continue
      const distance = Phaser.Math.Distance.Between(soldier.x, soldier.y, target.x, target.y)
      if (distance > 25) {
        const step = Math.min(distance - 22, 105 * dt)
        soldier.x += (target.x - soldier.x) / distance * step
        soldier.y += (target.y - soldier.y) / distance * step
      } else if (soldier.attack <= 0) {
        target.health -= 42
        soldier.attack = 0.75
        this.projectiles.push({ x: soldier.x, y: soldier.y, tx: target.x, ty: target.y, life: 0.12, color: 0xb9e2a2 })
        this.removeDefeated()
      }
    }
    this.reinforcements = this.reinforcements.filter((soldier) => soldier.life > 0)
  }

  private removeDefeated() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].health <= 0) {
        const enemy = this.enemies.splice(i, 1)[0]
        const state = useGameStore.getState()
        useGameStore.setState({ gold: state.gold + ENEMIES[enemy.type].reward, kills: state.kills + 1 })
      }
    }
  }

  private updateSkill(event: { id: number; kind: 'meteor' | 'reinforcements' } | null) {
    if (!event || event.id === this.lastSkillId) return
    this.lastSkillId = event.id
    if (event.kind === 'meteor') {
      playSound('meteor')
      const target = this.enemies.sort((a, b) => b.progress - a.progress)[0]
      if (!target) return
      this.enemies.forEach((enemy) => {
        if (Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y) < 145) enemy.health -= 210
      })
      for (let i = 0; i < 8; i++) this.projectiles.push({
        x: target.x + Phaser.Math.Between(-100, 100), y: target.y - 180,
        tx: target.x + Phaser.Math.Between(-65, 65), ty: target.y + Phaser.Math.Between(-55, 55),
        life: 0.5, color: 0xff7c39,
      })
      this.removeDefeated()
    } else {
      playSound('reinforcements')
      for (let i = 0; i < 3; i++) {
        this.reinforcements.push({
          x: this.hero.x + (i - 1) * 22, y: this.hero.y + 14,
          life: 10, attack: i * 0.16,
        })
      }
      useGameStore.setState((state) => ({ gold: state.gold + 35 }))
    }
  }

  private updateProjectiles(dt: number) {
    this.projectiles = this.projectiles.filter((projectile) => {
      projectile.life -= dt
      return projectile.life > 0
    })
  }

  private drawActors() {
    const g = this.actors
    g.clear()
    const state = useGameStore.getState()
    const selected = state.towers.find((tower) => tower.id === state.selectedTowerId)
    if (selected) {
      const slot = TOWER_SLOTS[selected.slot]
      const range = TOWERS[selected.type].range + (selected.level - 1) * 10
      g.fillStyle(0x79d5ff, 0.12).fillCircle(slot.x, slot.y, range)
      g.lineStyle(1, 0xb6efff, 0.6).strokeCircle(slot.x, slot.y, range)
    }
    if (state.buildType) {
      TOWER_SLOTS.forEach((slot, index) => {
        if (!state.towers.some((tower) => tower.slot === index)) {
          g.lineStyle(2, state.gold >= TOWERS[state.buildType!].cost ? 0xffef9c : 0xe77d6b, 0.72).strokeCircle(slot.x, slot.y, 26)
        }
      })
    }
    state.towers.forEach((tower) => {
      const slot = TOWER_SLOTS[tower.slot]
      const color = TOWERS[tower.type].color
      const size = 17 + (tower.level - 1) * 2
      g.fillStyle(0x293329, 0.45).fillEllipse(slot.x, slot.y + 13, 39, 15)
      g.fillStyle(0x66442e).fillRect(slot.x - size / 2, slot.y - size / 2, size, size)
      g.fillStyle(color).fillCircle(slot.x, slot.y - 5, size * 0.55)
      g.fillStyle(0xffedb5).fillCircle(slot.x - 5, slot.y - 10, 3)
      if (tower.type === 'cannon') g.fillStyle(0x343a42).fillRect(slot.x - 4, slot.y - 14, 14, 5)
      if (tower.type === 'mage') g.fillStyle(0xc5a5ff).fillTriangle(slot.x - 7, slot.y - 16, slot.x, slot.y - 29, slot.x + 7, slot.y - 16)
      if (tower.type === 'barracks') g.fillStyle(0xf0dc9d).fillRect(slot.x - 5, slot.y - 18, 10, 13)
      g.lineStyle(2, 0xffe891, 1).strokeCircle(slot.x, slot.y, 19 + tower.level * 2)
      for (let level = 0; level < tower.level; level++) {
        g.fillStyle(0xffdf75).fillCircle(slot.x - 9 + level * 9, slot.y + 23, 2.5)
      }
    })
    this.drawHero(g)
    this.enemies.forEach((enemy) => this.drawEnemy(g, enemy))
    this.reinforcements.forEach((soldier) => {
      g.fillStyle(0x263328, 0.4).fillEllipse(soldier.x, soldier.y + 12, 24, 9)
      g.fillStyle(0x72995d).fillRoundedRect(soldier.x - 7, soldier.y - 3, 14, 17, 4)
      g.fillStyle(0xe4c89e).fillCircle(soldier.x, soldier.y - 7, 7)
      g.fillStyle(0xdce9ed).fillRect(soldier.x + 5, soldier.y - 13, 3, 17)
      g.lineStyle(1, 0xbce99d, 0.75).strokeCircle(soldier.x, soldier.y, 13)
    })
    this.projectiles.forEach((p) => {
      const alpha = Math.min(1, p.life * 5)
      g.lineStyle(p.color === 0xff7c39 ? 5 : 2, p.color, alpha).lineBetween(p.x, p.y, p.tx, p.ty)
      g.fillStyle(p.color, alpha).fillCircle(p.tx, p.ty, p.color === 0xff7c39 ? 8 : 3)
    })
  }

  private drawEnemy(g: Phaser.GameObjects.Graphics, enemy: Enemy) {
    const definition = ENEMIES[enemy.type]
    const boss = enemy.type === 'boss'
    const r = boss ? 21 : enemy.type === 'wolf' ? 12 : 14
    g.fillStyle(0x243127, 0.4).fillEllipse(enemy.x, enemy.y + r * 0.65, r * 2, r * 0.8)
    g.fillStyle(definition.color).fillCircle(enemy.x, enemy.y, r)
    g.fillStyle(0xe6d6ad).fillCircle(enemy.x + r * 0.55, enemy.y - r * 0.1, r * 0.35)
    g.fillStyle(0x2a2524).fillCircle(enemy.x + r * 0.6, enemy.y - r * 0.12, 2)
    if (enemy.type === 'demon' || boss) {
      g.fillStyle(0x542a45).fillTriangle(enemy.x - r * 0.65, enemy.y - r * 0.45, enemy.x - r * 1.15, enemy.y - r * 1.1, enemy.x - r * 0.1, enemy.y - r * 0.85)
      g.fillStyle(0x542a45).fillTriangle(enemy.x + r * 0.45, enemy.y - r * 0.5, enemy.x + r * 1.2, enemy.y - r * 1.15, enemy.x + r * 0.1, enemy.y - r * 0.9)
    }
    const width = boss ? 46 : 30
    g.fillStyle(0x492f2b).fillRoundedRect(enemy.x - width / 2, enemy.y - r - 10, width, 5, 2)
    g.fillStyle(enemy.health / enemy.maxHealth < 0.3 ? 0xe56c4c : 0x7bd06c).fillRoundedRect(enemy.x - width / 2, enemy.y - r - 10, width * Phaser.Math.Clamp(enemy.health / enemy.maxHealth, 0, 1), 5, 2)
    if (boss) {
      g.lineStyle(2, 0xffdd94).strokeCircle(enemy.x, enemy.y, r + 4)
    }
  }

  private drawHero(g: Phaser.GameObjects.Graphics) {
    const bob = Math.sin(this.time.now / 130) * 2
    g.fillStyle(0x202c2b, 0.35).fillEllipse(this.hero.x, this.hero.y + 16, 33, 12)
    g.fillStyle(0x456fb0).fillRoundedRect(this.hero.x - 10, this.hero.y - 5 + bob, 20, 24, 6)
    g.fillStyle(0xe7bd87).fillCircle(this.hero.x, this.hero.y - 10 + bob, 10)
    g.fillStyle(0x47372c).fillEllipse(this.hero.x, this.hero.y - 17 + bob, 21, 8)
    g.fillStyle(0xd4e8f4).fillCircle(this.hero.x + 3, this.hero.y - 11 + bob, 2)
    g.lineStyle(3, 0xdce9ed).lineBetween(this.hero.x + 9, this.hero.y + 1 + bob, this.hero.x + 18, this.hero.y - 14 + bob)
    g.fillStyle(0xe2be65).fillCircle(this.hero.x, this.hero.y - 29 + bob, 3)
    g.fillStyle(0xfff0a3, 0.18).fillCircle(this.hero.x, this.hero.y, 39)
  }
}
