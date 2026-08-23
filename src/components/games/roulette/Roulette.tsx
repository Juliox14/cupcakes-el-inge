import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import confetti from 'canvas-confetti'
import './Roulette.css'
import type { PlayGameResult } from '../../../types'
import type { RouletteProps, RouletteSlice, RouletteResultState } from './Roulette.types'
import { drawWheel, ROULETTE_SZ } from './RouletteCanvas'
import { RoulettePointer } from './RoulettePointer'
import { RouletteResultCard } from './RouletteResultCard'
import { MajorPrizeModal } from './MajorPrizeModal'
import { rouletteSound } from './RouletteSound'

const DEFAULT_SLICES: RouletteSlice[] = [
  { text: '¡CUPCAKE GRATIS!', emoji: '🎁', type: 'gift',  color: '#F56B2A', tcolor: '#fff',    weight: 5  },
  { text: 'Promo: 2x$35 MXN',  emoji: '💸', type: 'promo', color: '#fff',    tcolor: '#5a2e00', weight: 20 },
  { text: '¡Sigue Intentando!', emoji: '👾', type: 'none',  color: '#F56B2A', tcolor: '#fff',    weight: 50 },
  { text: 'Descuento: $5 MXN', emoji: '🏷️', type: 'disc',  color: '#fff',    tcolor: '#5a2e00', weight: 20 },
  { text: '¡CUPCAKE GRATIS!', emoji: '🎁', type: 'gift',  color: '#F56B2A', tcolor: '#fff',    weight: 5  },
  { text: 'Promo: 2x$35 MXN',  emoji: '💸', type: 'promo', color: '#fff',    tcolor: '#5a2e00', weight: 20 },
  { text: '¡Sigue Intentando!', emoji: '👾', type: 'none',  color: '#F56B2A', tcolor: '#fff',    weight: 50 },
  { text: 'Descuento: $5 MXN', emoji: '🏷️', type: 'disc',  color: '#fff',    tcolor: '#5a2e00', weight: 20 },
]

// Confeti para premio normal (Promociones / Descuentos)
function triggerNormalConfetti() {
  try {
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#F56B2A', '#FFA726', '#FFD54F', '#4CAF50', '#2196F3'],
      disableForReducedMotion: true,
    })
  } catch {}
}

// Confeti masivo de varias ráfagas laterales y centrales para PREMIO MAYOR
function triggerMajorConfetti() {
  try {
    const end = Date.now() + 3200
    const colors = ['#F56B2A', '#FFD700', '#FF4081', '#00E676', '#00E5FF', '#FFFFFF']

    const frame = () => {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors,
      })
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()

    // Gran explosión central
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.55 },
      colors,
    })
  } catch {}
}

// Curva de inercia y fricción hiper-fluida (Simulación física de momento angular)
function naturalEaseOut(t: number): number {
  return 1 - Math.pow(1 - t, 4.4)
}

// Distribución uniforme e intercalada para que los "sin premio" nunca queden juntos
function evenlyDispersePrizes(activePrizes: any[]): any[] {
  if (activePrizes.length <= 2) return activePrizes

  const noPrizes = activePrizes.filter(
    p => p.tier === 'tier_50_no_prize' || (p as any).categoria_nivel === 'sin_premio'
  )
  const highPrizes = activePrizes.filter(
    p => p.tier === 'tier_10_high_value' || (p as any).categoria_nivel === 'alto_valor'
  )
  const promoPrizes = activePrizes.filter(
    p => !noPrizes.includes(p) && !highPrizes.includes(p)
  )

  if (noPrizes.length === 0) return activePrizes

  // Alternar premios ganadores (Altos con Promos)
  const winPrizes: any[] = []
  const maxW = Math.max(highPrizes.length, promoPrizes.length)
  for (let i = 0; i < maxW; i++) {
    if (i < highPrizes.length) winPrizes.push(highPrizes[i])
    if (i < promoPrizes.length) winPrizes.push(promoPrizes[i])
  }

  const total = activePrizes.length
  const result = new Array(total)

  // Dispersar equitativamente los "sin premio" a lo largo de los 360 grados
  const noCount = noPrizes.length
  const step = total / noCount
  for (let i = 0; i < noCount; i++) {
    const pos = Math.floor(i * step + step / 2) % total
    result[pos] = noPrizes[i]
  }

  // Rellenar las demás posiciones con premios ganadores
  let wIdx = 0
  for (let i = 0; i < total; i++) {
    if (!result[i]) {
      result[i] = winPrizes[wIdx % winPrizes.length] || activePrizes[i]
      wIdx++
    }
  }

  return result
}

export function Roulette({ spinsAvailable, prizes = [], onPlay }: RouletteProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const angleRef     = useRef(0)
  const spinningRef  = useRef(false)
  const spinIdRef    = useRef(0)
  const cupcakeRef   = useRef<HTMLImageElement | null>(null)
  const rafRef       = useRef<number>(0)
  const lastPinRef   = useRef(0)
  const ptrWrapRef   = useRef<HTMLDivElement>(null)
  
  // Estado físico del puntero (resorte armónico)
  const ptrAngleRef    = useRef(0)
  const ptrVelocityRef = useRef(0)

  const [spinning, setSpinning] = useState(false)
  const [localSpins, setLocalSpins] = useState(spinsAvailable)
  const [result, setResult]     = useState<RouletteResultState | null>(null)
  const [showMajorModal, setShowMajorModal] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Mapear dinámicamente todos los premios activos de Supabase con distribución intercalada
  const slices: RouletteSlice[] = useMemo(() => {
    const active = (prizes || []).filter(p => p.is_active)
    if (active.length === 0) return DEFAULT_SLICES

    const dispersedPrizes = evenlyDispersePrizes(active)
    const totalSegments = dispersedPrizes.length >= 8 ? dispersedPrizes.length : 8
    const list: RouletteSlice[] = []

    for (let i = 0; i < totalSegments; i++) {
      const prize = dispersedPrizes[i % dispersedPrizes.length]
      const isHigh = prize.tier === 'tier_10_high_value' || (prize as any).categoria_nivel === 'alto_valor'
      const isNone = prize.tier === 'tier_50_no_prize' || (prize as any).categoria_nivel === 'sin_premio'
      const isOrange = i % 2 === 0

      list.push({
        id: prize.id,
        text: prize.title,
        emoji: isHigh ? '🎁' : isNone ? '🥕' : '🏷️',
        type: isHigh ? 'gift' : isNone ? 'none' : 'promo',
        color: isOrange ? '#F56B2A' : '#ffffff',
        tcolor: isOrange ? '#ffffff' : '#5a2e00',
        weight: prize.weight || 20
      })
    }

    return list
  }, [prizes])

  const n = slices.length
  const arc = (2 * Math.PI) / n

  useEffect(() => {
    setLocalSpins(spinsAvailable)
  }, [spinsAvailable])

  // Cargar imagen del cupcake central
  useEffect(() => {
    const img = new Image()
    img.onload  = () => { cupcakeRef.current = img; redraw() }
    img.onerror = () => { cupcakeRef.current = null }
    img.src = '/cupcake-color.png'
  }, [])

  // Renderizado con soporte Retina Subpixel en alta definición
  const redraw = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 2, 3) : 2
    if (cv.width !== ROULETTE_SZ * dpr || cv.height !== ROULETTE_SZ * dpr) {
      cv.width = ROULETTE_SZ * dpr
      cv.height = ROULETTE_SZ * dpr
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    drawWheel(ctx, angleRef.current, cupcakeRef.current, slices)
    ctx.restore()
  }, [slices])

  useEffect(() => { redraw() }, [redraw])

  function getPinsPassed(angle: number) {
    return Math.floor((angle + 0.001) / arc)
  }

  // Giro de la Ruleta ultra-fluido (60/120 FPS Locked)
  const spin = useCallback(async () => {
    if (spinningRef.current || localSpins <= 0) return

    const spinId = ++spinIdRef.current
    spinningRef.current = true
    setSpinning(true)
    rouletteSound.init()
    setLocalSpins(prev => Math.max(0, prev - 1))
    setResult(null)
    setShowMajorModal(false)
    setErrorMsg(null)
    lastPinRef.current = getPinsPassed(angleRef.current)

    // 1. Invocar backend para determinar resultado
    let apiResult: PlayGameResult | null = null
    try {
      apiResult = await onPlay('roulette')
    } catch {
      // Continuar con tirada local
    }

    // 2. Determinar segmento exacto de aterrizaje (100% Sincronizado con el premio del backend)
    let targetIdx = 0
    if (apiResult) {
      const prizeId = apiResult.prize?.id
      const prizeTitle = (apiResult.prize?.title || '').toLowerCase().trim()

      // A. Coincidencia exacta por ID de premio
      let foundIdx = slices.findIndex(s => s.id && prizeId && s.id === prizeId)

      // B. Coincidencia por texto exacto
      if (foundIdx < 0 && prizeTitle) {
        foundIdx = slices.findIndex(s => s.text.toLowerCase().trim() === prizeTitle)
      }

      // C. Coincidencia por similitud de texto
      if (foundIdx < 0 && prizeTitle) {
        foundIdx = slices.findIndex(s => 
          s.text.toLowerCase().includes(prizeTitle.slice(0, 10)) ||
          prizeTitle.includes(s.text.toLowerCase().slice(0, 10))
        )
      }

      if (foundIdx >= 0) {
        targetIdx = foundIdx
      } else {
        if (!apiResult.won) {
          const noneIdx = slices.findIndex(s => s.type === 'none')
          targetIdx = noneIdx >= 0 ? noneIdx : 0
        } else {
          const wonIdx = slices.findIndex(s => s.type !== 'none')
          targetIdx = wonIdx >= 0 ? wonIdx : 0
        }
      }
    } else {
      const totalWeight = slices.reduce((acc, s) => acc + s.weight, 0) || 1
      let rand = Math.floor(Math.random() * totalWeight)
      for (let i = 0; i < slices.length; i++) {
        rand -= slices[i].weight
        if (rand < 0) {
          targetIdx = i
          break
        }
      }
    }

    const finalSlice = slices[targetIdx]
    const isActuallyWon = apiResult ? apiResult.won : (finalSlice.type !== 'none')
    const isMajorPrize = isActuallyWon && (
      finalSlice.type === 'gift' ||
      apiResult?.prize?.tier === 'tier_10_high_value' ||
      (apiResult?.prize as any)?.categoria_nivel === 'alto_valor' ||
      finalSlice.text.toLowerCase().includes('gratis') ||
      finalSlice.text.toLowerCase().includes('pastel')
    )

    // 3. Rotación matemática con alineación perfecta al puntero (a las 3 en punto: 0 rad)
    const segmentMid  = targetIdx * arc + arc / 2
    const currentNorm = ((angleRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    let   needed      = ((0 - segmentMid - currentNorm) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
    if (needed < 0.01) needed += 2 * Math.PI
    
    // 8 vueltas completas dinámicas + ángulo objetivo
    const totalRot = 8 * 2 * Math.PI + needed

    const dur = 5400 // 5.4 segundos (tiempo áureo de emoción y suavidad)
    const t0  = performance.now()
    const a0  = angleRef.current
    const cv  = canvasRef.current!
    const ctx = cv.getContext('2d')!
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 2, 3) : 2

    let targetPtrBend = 0

    const frame = (now: number) => {
      if (spinIdRef.current !== spinId) return

      const t = Math.min((now - t0) / dur, 1)
      const currentAngle = a0 + totalRot * naturalEaseOut(t)
      angleRef.current = currentAngle

      // Dibujar Canvas
      ctx.save()
      ctx.scale(dpr, dpr)
      drawWheel(ctx, currentAngle, cupcakeRef.current, slices)
      ctx.restore()

      // Detección de paso de topes (Pins) para la física del puntero y sonido
      const newPins = getPinsPassed(currentAngle)
      const currentSpeed = (totalRot * (1 - t) * 4.4) / (dur / 1000) // rad/seg

      if (newPins !== lastPinRef.current) {
        lastPinRef.current = newPins
        const bendStrength = Math.min(22, Math.max(5, currentSpeed * 1.6))
        targetPtrBend = -bendStrength

        // Reproducir sonido "Tic" mecánico procedural
        const speedRatio = Math.min(1, Math.max(0.1, currentSpeed / 20))
        rouletteSound.playTick(speedRatio)

        // Vibración háptica en dispositivos móviles
        if (typeof navigator !== 'undefined' && navigator.vibrate && currentSpeed < 10) {
          navigator.vibrate(6)
        }
      } else {
        // Relajar puntero hacia 0 cuando no hay impacto
        targetPtrBend *= 0.85
      }

      // Física armónica suave para el puntero zanahoria
      const springTension = 0.38
      const springDamping = 0.72
      ptrVelocityRef.current += (targetPtrBend - ptrAngleRef.current) * springTension
      ptrVelocityRef.current *= springDamping
      ptrAngleRef.current += ptrVelocityRef.current

      if (ptrWrapRef.current) {
        ptrWrapRef.current.style.transform = `translateY(-50%) rotate(${ptrAngleRef.current.toFixed(2)}deg)`
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame)
        return
      }

      // Finalización del giro
      angleRef.current = a0 + totalRot
      ctx.save()
      ctx.scale(dpr, dpr)
      drawWheel(ctx, angleRef.current, cupcakeRef.current, slices)
      ctx.restore()

      if (ptrWrapRef.current) {
        ptrWrapRef.current.style.transform = `translateY(-50%) rotate(0deg)`
      }

      spinningRef.current = false
      setSpinning(false)

      // Celebración según el tipo de premio
      if (isMajorPrize) {
        rouletteSound.playMajorPrize()
        triggerMajorConfetti()
        setShowMajorModal(true)
      } else if (isActuallyWon) {
        rouletteSound.playNormalPrize()
        triggerNormalConfetti()
      }

      setResult({
        slice: finalSlice,
        apiResult,
        isWon: isActuallyWon
      })
    }

    rafRef.current = requestAnimationFrame(frame)
  }, [localSpins, slices, arc, onPlay])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="roulette-container">
      <div className={`roulette-wheel-wrapper ${spinning ? 'is-spinning' : ''}`}>
        <canvas
          ref={canvasRef}
          style={{ width: `${ROULETTE_SZ}px`, height: `${ROULETTE_SZ}px` }}
          className="roulette-canvas"
        />
        <RoulettePointer ref={ptrWrapRef} />
      </div>

      <button
        onClick={spin}
        disabled={spinning || localSpins <= 0}
        className="roulette-btn"
      >
        {spinning
          ? 'Girando...'
          : localSpins <= 0
            ? 'Sin giros disponibles'
            : `Girar la ruleta (${localSpins} ${localSpins === 1 ? 'tiro' : 'tiros'})`
        }
      </button>

      {errorMsg && (
        <p style={{ color: '#D32F2F', fontSize: '12px', marginTop: '10px' }}>{errorMsg}</p>
      )}

      {result && <RouletteResultCard result={result} />}

      {/* Modal de PREMIO MAYOR con Gato Bailando */}
      {showMajorModal && result && (
        <MajorPrizeModal
          prizeTitle={result.slice?.text || result.apiResult?.prize?.title || '¡Premio Mayor!'}
          couponCode={result.apiResult?.coupon?.code}
          onClose={() => setShowMajorModal(false)}
        />
      )}
    </div>
  )
}
