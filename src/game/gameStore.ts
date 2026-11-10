import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GamePhase, TowerInstance, TowerType } from './types'
import { TOWER_COSTS } from './types'

interface SaveData {
  bestWave: number
  victories: number
}

interface GameState extends SaveData {
  phase: GamePhase
  health: number
  gold: number
  wave: number
  kills: number
  paused: boolean
  speed: 1 | 2
  waveSpawning: boolean
  towers: TowerInstance[]
  selectedTowerId: string | null
  buildType: TowerType | null
  cooldowns: { meteor: number; reinforcements: number }
  skillEvent: { id: number; kind: 'meteor' | 'reinforcements' } | null
  runId: number
  startGame: () => void
  setPhase: (phase: GamePhase) => void
  setHud: (update: Partial<Pick<GameState, 'health' | 'gold' | 'wave' | 'kills' | 'waveSpawning'>>) => void
  setPaused: (paused: boolean) => void
  setSpeed: (speed: 1 | 2) => void
  setBuildType: (type: TowerType | null) => void
  selectTower: (id: string | null) => void
  addTower: (tower: TowerInstance) => void
  upgradeTower: (id: string) => void
  sellTower: (id: string) => void
  castSkill: (kind: 'meteor' | 'reinforcements') => void
}

export const useGameStore = create<GameState>()(persist((set, get) => ({
  bestWave: 0,
  victories: 0,
  phase: 'menu',
  health: 20,
  gold: 250,
  wave: 0,
  kills: 0,
  paused: false,
  speed: 1,
  waveSpawning: false,
  towers: [],
  selectedTowerId: null,
  buildType: null,
  cooldowns: { meteor: 0, reinforcements: 0 },
  skillEvent: null,
  runId: 0,
  startGame: () => set((state) => ({
    phase: 'playing', health: 20, gold: 250, wave: 0, kills: 0, paused: false, speed: 1,
    waveSpawning: false, towers: [], selectedTowerId: null, buildType: null,
    cooldowns: { meteor: 0, reinforcements: 0 }, skillEvent: null, runId: state.runId + 1,
  })),
  setPhase: (phase) => set((state) => ({
    phase,
    bestWave: Math.max(state.bestWave, state.wave),
    victories: phase === 'won' ? state.victories + 1 : state.victories,
    paused: phase !== 'playing',
  })),
  setHud: (update) => set((state) => ({
    ...update,
    bestWave: Math.max(state.bestWave, update.wave ?? state.wave),
  })),
  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => set({ speed }),
  setBuildType: (buildType) => set({ buildType, selectedTowerId: null }),
  selectTower: (selectedTowerId) => set({ selectedTowerId, buildType: null }),
  addTower: (tower) => set((state) => ({
    gold: state.gold - TOWER_COSTS[tower.type],
    towers: [...state.towers, tower],
    buildType: null,
    selectedTowerId: tower.id,
  })),
  upgradeTower: (id) => {
    const tower = get().towers.find((item) => item.id === id)
    if (!tower || tower.level >= 3) return
    const cost = tower.level === 1 ? 80 : 140
    set((state) => ({
      gold: state.gold - cost,
      towers: state.towers.map((item) => item.id === id ? { ...item, level: item.level + 1, invested: item.invested + cost } : item),
    }))
  },
  sellTower: (id) => set((state) => {
    const tower = state.towers.find((item) => item.id === id)
    if (!tower) return state
    return {
      gold: state.gold + Math.floor(tower.invested * 0.6),
      towers: state.towers.filter((item) => item.id !== id),
      selectedTowerId: null,
    }
  }),
  castSkill: (kind) => {
    const state = get()
    if (state.phase !== 'playing' || state.paused) return
    const now = Date.now()
    if (state.cooldowns[kind] > now) return
    set((current) => ({
      cooldowns: { ...current.cooldowns, [kind]: now + (kind === 'meteor' ? 18000 : 25000) },
      skillEvent: { id: (current.skillEvent?.id ?? 0) + 1, kind },
    }))
  },
}), {
  name: 'everwood-kingdom-save',
  partialize: (state) => ({ bestWave: state.bestWave, victories: state.victories }),
}))
