type SoundKind = 'start' | 'build' | 'attack' | 'meteor' | 'reinforcements' | 'wave' | 'upgrade' | 'sell' | 'victory' | 'defeat'

let audio: AudioContext | null = null
let master: GainNode | null = null
let enabled = true

export function initAudio() {
  if (!audio) {
    audio = new AudioContext()
    master = audio.createGain()
    master.gain.value = enabled ? 0.18 : 0
    master.connect(audio.destination)
  }
  if (audio.state === 'suspended') void audio.resume()
}

export function setSoundEnabled(value: boolean) {
  enabled = value
  if (master && audio) master.gain.setTargetAtTime(value ? 0.18 : 0, audio.currentTime, 0.025)
}

export function playSound(kind: SoundKind) {
  if (!enabled || !audio || !master) return
  const notes: Record<SoundKind, number[]> = {
    start: [392, 523, 659],
    build: [440, 554],
    attack: [740],
    meteor: [196, 147, 98],
    reinforcements: [392, 494, 587],
    wave: [330, 440],
    upgrade: [523, 659, 784],
    sell: [440, 330],
    victory: [523, 659, 784, 1047],
    defeat: [330, 247, 196],
  }
  const duration = kind === 'attack' ? 0.075 : kind === 'meteor' ? 0.28 : 0.14
  const start = audio.currentTime
  notes[kind].forEach((frequency, index) => {
    const oscillator = audio!.createOscillator()
    const gain = audio!.createGain()
    const noteStart = start + index * 0.075
    const noteDuration = kind === 'attack' ? duration : duration * 1.65
    oscillator.type = kind === 'meteor' ? 'sawtooth' : 'triangle'
    oscillator.frequency.setValueAtTime(frequency, noteStart)
    if (kind === 'meteor') oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * 0.48), noteStart + noteDuration)
    gain.gain.setValueAtTime(0.0001, noteStart)
    gain.gain.linearRampToValueAtTime(kind === 'attack' ? 0.11 : 0.28, noteStart + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDuration)
    oscillator.connect(gain)
    gain.connect(master!)
    oscillator.start(noteStart)
    oscillator.stop(noteStart + noteDuration + 0.02)
  })
}
