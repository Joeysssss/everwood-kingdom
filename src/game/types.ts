export type TowerType = 'archer' | 'mage' | 'cannon' | 'barracks'
export type EnemyType = 'goblin' | 'orc' | 'wolf' | 'knight' | 'demon' | 'boss'
export type GamePhase = 'menu' | 'playing' | 'won' | 'lost'

export interface TowerDefinition {
  name: string
  icon: string
  cost: number
  range: number
  damage: number
  attackRate: number
  description: string
  color: number
}

export interface TowerInstance {
  id: string
  type: TowerType
  level: number
  slot: number
  invested: number
}

export interface EnemyDefinition {
  name: string
  color: number
  health: number
  speed: number
  reward: number
  armor: number
}

export const TOWERS: Record<TowerType, TowerDefinition> = {
  archer: { name: '弓箭塔', icon: '🏹', cost: 70, range: 175, damage: 16, attackRate: 0.62, description: '快速精準的單體攻擊', color: 0x9b6338 },
  mage: { name: '法師塔', icon: '✨', cost: 100, range: 190, damage: 36, attackRate: 1.15, description: '魔法穿透厚重護甲', color: 0x9256d9 },
  cannon: { name: '砲塔', icon: '💣', cost: 120, range: 155, damage: 48, attackRate: 1.75, description: '範圍爆炸，重創群敵', color: 0x596579 },
  barracks: { name: '兵營', icon: '🛡️', cost: 90, range: 88, damage: 25, attackRate: 0.8, description: '勇士駐守路口阻擊敵人', color: 0x3e9a73 },
}

export const ENEMIES: Record<EnemyType, EnemyDefinition> = {
  goblin: { name: '哥布林', color: 0x7db34c, health: 48, speed: 50, reward: 8, armor: 0 },
  orc: { name: '獸人', color: 0x9b5948, health: 130, speed: 31, reward: 15, armor: 0.1 },
  wolf: { name: '狼騎兵', color: 0xc3b09a, health: 92, speed: 83, reward: 14, armor: 0.05 },
  knight: { name: '裝甲騎士', color: 0x8f9aac, health: 230, speed: 25, reward: 23, armor: 0.42 },
  demon: { name: '飛行惡魔', color: 0xb45d78, health: 140, speed: 66, reward: 20, armor: 0.12 },
  boss: { name: '森林魔王', color: 0x793f5d, health: 1800, speed: 22, reward: 180, armor: 0.25 },
}

export const TOWER_COSTS: Record<TowerType, number> = {
  archer: TOWERS.archer.cost,
  mage: TOWERS.mage.cost,
  cannon: TOWERS.cannon.cost,
  barracks: TOWERS.barracks.cost,
}

export const TOWER_SLOTS = [
  { x: 122, y: 354 }, { x: 236, y: 365 }, { x: 285, y: 250 },
  { x: 420, y: 354 }, { x: 476, y: 520 }, { x: 612, y: 305 },
  { x: 678, y: 166 }, { x: 820, y: 296 }, { x: 862, y: 438 },
]

export const PATH = [
  { x: -18, y: 440 }, { x: 165, y: 440 }, { x: 165, y: 300 },
  { x: 350, y: 300 }, { x: 350, y: 480 }, { x: 540, y: 480 },
  { x: 540, y: 220 }, { x: 730, y: 220 }, { x: 730, y: 380 },
  { x: 920, y: 380 }, { x: 920, y: 112 },
]
