import { useEffect, useMemo, useRef, useState } from 'react'
import { PhaserGame } from './game/PhaserGame'
import { GameScene } from './game/GameScene'
import { useGameStore } from './game/gameStore'
import { TOWERS } from './game/types'
import type { TowerType } from './game/types'
import { initAudio, playSound, setSoundEnabled } from './game/audio'
import './App.css'

const TOWER_ORDER: TowerType[] = ['archer', 'mage', 'cannon', 'barracks']

function App() {
  const phase = useGameStore((state) => state.phase)
  const health = useGameStore((state) => state.health)
  const gold = useGameStore((state) => state.gold)
  const wave = useGameStore((state) => state.wave)
  const kills = useGameStore((state) => state.kills)
  const paused = useGameStore((state) => state.paused)
  const speed = useGameStore((state) => state.speed)
  const waveSpawning = useGameStore((state) => state.waveSpawning)
  const towers = useGameStore((state) => state.towers)
  const selectedTowerId = useGameStore((state) => state.selectedTowerId)
  const buildType = useGameStore((state) => state.buildType)
  const cooldowns = useGameStore((state) => state.cooldowns)
  const bestWave = useGameStore((state) => state.bestWave)
  const victories = useGameStore((state) => state.victories)
  const startGame = useGameStore((state) => state.startGame)
  const setPaused = useGameStore((state) => state.setPaused)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const setBuildType = useGameStore((state) => state.setBuildType)
  const selectTower = useGameStore((state) => state.selectTower)
  const upgradeTower = useGameStore((state) => state.upgradeTower)
  const sellTower = useGameStore((state) => state.sellTower)
  const castSkill = useGameStore((state) => state.castSkill)
  const [scene, setScene] = useState<GameScene | null>(null)
  const [now, setNow] = useState(0)
  const [soundOn, setSoundOn] = useState(true)
  const previousPhase = useRef(phase)
  const selectedTower = towers.find((tower) => tower.id === selectedTowerId)
  const upgradeCost = selectedTower?.level === 1 ? 80 : 140

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (previousPhase.current !== phase && (phase === 'won' || phase === 'lost')) {
      playSound(phase === 'won' ? 'victory' : 'defeat')
    }
    previousPhase.current = phase
  }, [phase])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.target instanceof HTMLInputElement) return
      if (event.key.toLowerCase() === 'q') castSkill('meteor')
      if (event.key.toLowerCase() === 'w') castSkill('reinforcements')
      if (event.key === 'Escape' && phase === 'playing') setPaused(!useGameStore.getState().paused)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [castSkill, phase, setPaused])

  const objective = useMemo(() => {
    if (wave === 0) return '敵人正從森林深處集結，準備好就召喚第一波。'
    if (wave === 20) return '最後防線！森林魔王已逼近翡翠城堡。'
    return `第 ${wave} 波敵人已出現。建造防線，守住森林之心！`
  }, [wave])

  const skillRemaining = (kind: 'meteor' | 'reinforcements') => Math.max(0, Math.ceil((cooldowns[kind] - now) / 1000))
  const canAdvance = phase === 'playing' && !paused && !waveSpawning && wave < 20
  const beginGame = () => {
    initAudio()
    playSound('start')
    startGame()
  }
  const toggleSound = () => {
    initAudio()
    setSoundOn((enabled) => {
      setSoundEnabled(!enabled)
      return !enabled
    })
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark">✦</span>
          <span><strong>翡翠王國</strong><small>EVERWOOD DEFENSE</small></span>
        </a>
        <div className="topbar-center"><span className="online-dot" /> 森林之心仍在燃燒</div>
        <button className={`sound-button ${soundOn ? '' : 'muted'}`} title={soundOn ? '關閉音效' : '開啟音效'} aria-label={soundOn ? '關閉音效' : '開啟音效'} onClick={toggleSound}>{soundOn ? '♫' : '♪̸'}</button>
      </header>

      <section className="battle-layout">
        <div className="battle-board">
          <div className="board-heading">
            <div><span className="eyebrow">翡翠森林 · 第一章</span><h1>守護森林之心</h1></div>
            <div className="mission-chip"><span>⚑</span> {objective}</div>
          </div>
          <div className="map-frame">
            <PhaserGame onSceneReady={setScene} />
            {phase === 'playing' && paused && (
              <div className="pause-cover"><div className="pause-card"><span>Ⅱ</span><h2>戰場已暫停</h2><p>準備好後，繼續守護翡翠城堡。</p><button className="gold-button" onClick={() => setPaused(false)}>繼續遊戲 <span>→</span></button></div></div>
            )}
            {(phase === 'menu' || phase === 'won' || phase === 'lost') && (
              <div className="modal-cover">
                <div className={`intro-card ${phase !== 'menu' ? 'result-card' : ''}`}>
                  <div className="crest">✦</div>
                  {phase === 'menu' ? (
                    <>
                      <span className="eyebrow">一段森林傳說</span>
                      <h2>翡翠王國</h2>
                      <p className="intro-subtitle">森林之心，永不陷落</p>
                      <p className="intro-copy">黑暗軍團正穿越古老森林。建造防禦塔、召集英雄，守住通往城堡的最後道路。</p>
                      <button className="gold-button start-button" onClick={beginGame}>開始守衛 <span>→</span></button>
                      <div className="save-summary">🏆 最遠波次 {bestWave}　·　勝利 {victories} 次</div>
                    </>
                  ) : (
                    <>
                      <span className="eyebrow">{phase === 'won' ? '森林重歸寧靜' : '城堡需要再次集結'}</span>
                      <h2>{phase === 'won' ? '勝利！' : '防線失守'}</h2>
                      <p className="intro-subtitle">{phase === 'won' ? '森林之心仍然閃耀' : `你守到了第 ${wave} 波`}</p>
                      <p className="intro-copy">擊退敵人 {kills} 隻 · 最遠波次 {bestWave}</p>
                      <button className="gold-button start-button" onClick={beginGame}>再次出征 <span>→</span></button>
                    </>
                  )}
                  <div className="modal-footnote">為原創奇幻世界而生 · 無外部美術素材</div>
                </div>
              </div>
            )}
          </div>
          <div className="board-foot">
            <span><i className="legend-dot road" />敵軍路線</span>
            <span><i className="legend-dot slot" />固定建塔位置</span>
            <span><i className="legend-dot hero" />點擊地圖移動英雄</span>
            <span className="kill-count">⚔ {kills} 擊退</span>
          </div>
        </div>

        <aside className="status-panel">
          <section className="stats-row">
            <div className="stat-card lives"><span className="stat-icon">♥</span><span className="stat-label">城堡生命</span><strong>{health}<small> / 20</small></strong><div className="meter"><i style={{ width: `${health * 5}%` }} /></div></div>
            <div className="stat-card coins"><span className="stat-icon">◈</span><span className="stat-label">黃金</span><strong>{gold}<small> G</small></strong><span className="stat-caption">擊退敵人可獲得獎勵</span></div>
            <div className="stat-card wave-card"><span className="stat-icon">⚑</span><span className="stat-label">敵軍波次</span><strong>{String(wave).padStart(2, '0')}<small> / 20</small></strong><div className="wave-dots">{Array.from({ length: 20 }, (_, i) => <i key={i} className={i < wave ? 'filled' : ''} />)}</div></div>
          </section>

          <section className="defense-panel">
            <div className="section-title"><div><span className="eyebrow">部署你的防線</span><h2>防禦塔</h2></div><span className="tower-count">{towers.length} / 9</span></div>
            <div className="tower-grid">
              {TOWER_ORDER.map((type) => {
                const tower = TOWERS[type]
                const active = buildType === type
                const affordable = gold >= tower.cost
                return (
                  <button
                    className={`tower-card ${active ? 'active' : ''} ${!affordable ? 'unaffordable' : ''}`}
                    key={type}
                    onClick={() => setBuildType(active ? null : type)}
                    disabled={phase !== 'playing' || paused || !affordable}
                    aria-pressed={active}
                  >
                    <span className={`tower-icon ${type}`}>{tower.icon}</span>
                    <span className="tower-card-copy"><strong>{tower.name}</strong><small>{tower.description}</small><b>◈ {tower.cost} G</b></span>
                    <span className="tower-arrow">›</span>
                  </button>
                )
              })}
            </div>
            <p className="panel-hint">{buildType ? <><b>{TOWERS[buildType].name}</b> 已就緒，點擊地圖上的金色塔位建造。</> : '選擇防禦塔，再點擊地圖上的金色塔位。'}</p>
          </section>

          <section className="selected-panel">
            {selectedTower ? (
              <>
                <div className="section-title compact"><div><span className="eyebrow">塔位管理 · Lv.{selectedTower.level}</span><h2>{TOWERS[selectedTower.type].icon} {TOWERS[selectedTower.type].name}</h2></div><button className="close-button" onClick={() => selectTower(null)} aria-label="關閉">×</button></div>
                <div className="tower-details"><span>攻擊範圍 <b>{TOWERS[selectedTower.type].range + (selectedTower.level - 1) * 10}</b></span><span>攻擊力 <b>{Math.round(TOWERS[selectedTower.type].damage * (1 + (selectedTower.level - 1) * 0.65))}</b></span><span>出售返還 <b>{Math.floor(selectedTower.invested * 0.6)} G</b></span></div>
                <div className="tower-actions">
                  <button className="upgrade-button" onClick={() => { playSound('upgrade'); upgradeTower(selectedTower.id) }} disabled={selectedTower.level >= 3 || gold < upgradeCost || phase !== 'playing' || paused}>
                    {selectedTower.level >= 3 ? '✦ 已達最高等級' : `升級至 Lv.${selectedTower.level + 1} · ◈ ${upgradeCost} G`}
                  </button>
                  <button className="sell-button" onClick={() => { playSound('sell'); sellTower(selectedTower.id) }} disabled={phase !== 'playing' || paused}>出售</button>
                </div>
              </>
            ) : (
              <div className="empty-selection"><span>⌖</span><div><strong>選擇一座防禦塔</strong><small>查看攻擊範圍、升級或出售</small></div></div>
            )}
          </section>

          <section className="command-panel">
            <div className="section-title compact"><div><span className="eyebrow">指揮官指令</span><h2>戰場控制</h2></div></div>
            <div className="command-row">
              <button className="control-button pause-control" onClick={() => setPaused(!paused)} disabled={phase !== 'playing'}><span>{paused ? '▶' : 'Ⅱ'}</span>{paused ? '繼續' : '暫停'}</button>
              <div className="speed-control"><span>速度</span><button className={speed === 1 ? 'chosen' : ''} onClick={() => setSpeed(1)} disabled={phase !== 'playing'}>1×</button><button className={speed === 2 ? 'chosen' : ''} onClick={() => setSpeed(2)} disabled={phase !== 'playing'}>2×</button></div>
            </div>
            <div className="skill-row">
              <button className="skill-button meteor" onClick={() => castSkill('meteor')} disabled={phase !== 'playing' || paused || skillRemaining('meteor') > 0}><span className="skill-icon">☄</span><span><b>流星火雨</b><small>{skillRemaining('meteor') ? `冷卻 ${skillRemaining('meteor')} 秒` : '範圍重擊 · 18 秒'}</small></span><kbd>Q</kbd></button>
              <button className="skill-button allies" onClick={() => castSkill('reinforcements')} disabled={phase !== 'playing' || paused || skillRemaining('reinforcements') > 0}><span className="skill-icon">⚔</span><span><b>召喚援軍</b><small>{skillRemaining('reinforcements') ? `冷卻 ${skillRemaining('reinforcements')} 秒` : '援軍支援 · 25 秒'}</small></span><kbd>W</kbd></button>
            </div>
            <button className="wave-button" onClick={() => { if (scene) { playSound('wave'); scene.startWave() } }} disabled={!canAdvance}>
              <span>{waveSpawning ? '敵軍正在進攻…' : wave >= 20 ? '最後一波進行中' : wave === 0 ? '召喚第一波敵人' : `提前召喚第 ${wave + 1} 波`}</span><b>{waveSpawning ? '···' : '→'}</b>
            </button>
            <p className="wave-note">{waveSpawning ? '迎擊來襲的敵人，防守完成後即可召喚下一波。' : '提前召喚可獲得額外金幣獎勵。'}</p>
          </section>
          <div className="panel-footer"><span>✦</span> 用你的智慧，守住森林之心</div>
        </aside>
      </section>
      <footer className="site-footer"><span>© 翡翠王國 · 森林守衛隊</span><span>原創程式繪製 · 合成音效</span></footer>
    </main>
  )
}

export default App
