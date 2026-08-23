// Sintetizador Web Audio y reproductor de efectos de sonido para la ruleta
class RouletteAudioEngine {
  private ctx: AudioContext | null = null
  private majorPrizeAudio: HTMLAudioElement | null = null
  private normalPrizeAudio: HTMLAudioElement | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.majorPrizeAudio = new Audio('/audio-premio-mayor.m4a')
        this.majorPrizeAudio.preload = 'auto'
        this.normalPrizeAudio = new Audio('/audio-premio.m4a')
        this.normalPrizeAudio.preload = 'auto'
      } catch {}
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  // Inicializar y desbloquear contexto y elementos de audio en la primera interacción del usuario
  public init() {
    this.getAudioContext()
    if (this.majorPrizeAudio) {
      this.majorPrizeAudio.load()
    }
    if (this.normalPrizeAudio) {
      this.normalPrizeAudio.load()
    }
  }

  // Sonido de "Tic" mecánico cuando el puntero golpea un pin de la ruleta
  public playTick(speedRatio = 1) {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return

      const now = ctx.currentTime

      // 1. Oscilador de chasquido de percusión mecánica
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      const baseFreq = 520 + Math.min(speedRatio * 180, 400)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(baseFreq, now)
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.035)

      const vol = Math.min(0.25, 0.08 + speedRatio * 0.12)
      gain.gain.setValueAtTime(vol, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)

      // 2. Filtro paso alto
      const filter = ctx.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.setValueAtTime(350, now)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.038)
    } catch {
      // Ignorar si el navegador bloquea audio
    }
  }

  // Reproducir sonido de PREMIO MAYOR (/audio-premio-mayor.m4a)
  public playMajorPrize() {
    try {
      if (this.majorPrizeAudio) {
        this.majorPrizeAudio.currentTime = 0
        this.majorPrizeAudio.play().catch(() => this.playWinFallback())
      } else {
        this.playWinFallback()
      }
    } catch {
      this.playWinFallback()
    }
  }

  // Reproducir sonido de PREMIO NORMAL (/audio-premio.m4a)
  public playNormalPrize() {
    try {
      if (this.normalPrizeAudio) {
        this.normalPrizeAudio.currentTime = 0
        this.normalPrizeAudio.play().catch(() => this.playWinFallback())
      } else {
        this.playWinFallback()
      }
    } catch {
      this.playWinFallback()
    }
  }

  // Fallback procedural melódico
  private playWinFallback() {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return

      const notes = [523.25, 659.25, 783.99, 1046.50]
      const now = ctx.currentTime

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        const noteTime = now + i * 0.11
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, noteTime)

        gain.gain.setValueAtTime(0, noteTime)
        gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(noteTime)
        osc.stop(noteTime + 0.36)
      })
    } catch {}
  }
}

export const rouletteSound = new RouletteAudioEngine()
