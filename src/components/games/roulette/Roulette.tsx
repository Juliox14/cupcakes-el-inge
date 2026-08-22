import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import './Roulette.css'
import type { PlayGameResult } from '../../../types'
import type { RouletteProps, RouletteSlice, RouletteResultState } from './Roulette.types'
import { drawWheel, ROULETTE_SZ } from './RouletteCanvas'
import { RoulettePointer } from './RoulettePointer'
import { RouletteResultCard } from './RouletteResultCard'

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

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 4)
}

export function Roulette({ spinsAvailable, prizes = [], onPlay }: RouletteProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const angleRef     = useRef(0)
  const spinningRef  = useRef(false)
  const spinIdRef    = useRef(0)
  const cupcakeRef   = useRef<HTMLImageElement | null>(null)
  const rafRef       = useRef<number>(0)
  const lastPinRef   = useRef(0)
  const ptrBendRef   = useRef(0)
  const ptrTargetRef = useRef(0)
  const ptrRafRef    = useRef<number>(0)
  const ptrWrapRef   = useRef<HTMLDivElement>(null)

  const [spinning, setSpinning] = useState(false)
  const [localSpins, setLocalSpins] = useState(spinsAvailable)
  const [result, setResult]     = useState<RouletteResultState | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Mapear dinámicamente los premios activos de Supabase
  const slices: RouletteSlice[] = useMemo(() => {
    const active = (prizes || []).filter(p => p.is_active)
    if (active.length === 0) return DEFAULT_SLICES

    const totalSegments = 8
    const list: RouletteSlice[] = []

    for (let i = 0; i < totalSegments; i++) {
      const prize = active[i % active.length]
      const isHigh = prize.tier === 'tier_10_high_value' || (prize as any).categoria_nivel === 'alto_valor'
      const isNone = prize.tier === 'tier_50_no_prize' || (prize as any).categoria_nivel === 'sin_premio'
      const isOrange = i % 2 === 0

      list.push({
        id: prize.id,
        text: prize.title,
        emoji: isHigh ? '🎁' : isNone ? '👾' : '🏷️',
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

  const redraw = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    drawWheel(ctx, angleRef.current, cupcakeRef.current, slices)
  }, [slices])

  useEffect(() => { redraw() }, [redraw])

  // Animación física del puntero
  const applyPointerRotation = useCallback((deg: number) => {
    if (!ptrWrapRef.current) return
    ptrWrapRef.current.style.transform = `translateY(-50%) rotate(${deg}deg)`
  }, [])

  const animatePointer = useCallback((targetDeg: number) => {
    ptrTargetRef.current = targetDeg
    if (ptrRafRef.current) return
    function step() {
      const diff = ptrTargetRef.current - ptrBendRef.current
      ptrBendRef.current += diff * 0.25
      if (Math.abs(diff) < 0.05) {
        ptrBendRef.current = ptrTargetRef.current
        applyPointerRotation(ptrBendRef.current)
        ptrRafRef.current = 0
        return
      }
      applyPointerRotation(ptrBendRef.current)
      ptrRafRef.current = requestAnimationFrame(step)
    }
    ptrRafRef.current = requestAnimationFrame(step)
  }, [applyPointerRotation])

  function getPinsPassed(angle: number) {
    return Math.floor((angle + 0.001) / arc)
  }

  // Giro de la Ruleta sincronizado
  const spin = useCallback(async () => {
    if (spinningRef.current || localSpins <= 0) return

    const spinId = ++spinIdRef.current
    spinningRef.current = true
    setSpinning(true)
    setLocalSpins(prev => Math.max(0, prev - 1))
    setResult(null)
    setErrorMsg(null)
    lastPinRef.current = getPinsPassed(angleRef.current)

    // 1. Invocar backend para determinar resultado
    let apiResult: PlayGameResult | null = null
    try {
      apiResult = await onPlay('roulette')
    } catch {
      // Continuar con tirada local
    }

    // 2. Determinar segmento de aterrizaje
    let targetIdx = 0
    if (apiResult) {
      if (!apiResult.won) {
        const noneIdx = slices.findIndex(s => s.type === 'none' || s.text.toLowerCase().includes('intentando') || s.text.toLowerCase().includes('suerte'))
        targetIdx = noneIdx >= 0 ? noneIdx : 0
      } else {
        const prizeId = apiResult.prize?.id
        const prizeTitle = (apiResult.prize?.title || '').toLowerCase()
        let foundIdx = slices.findIndex(s => s.id && prizeId && s.id === prizeId)
        if (foundIdx < 0) {
          foundIdx = slices.findIndex(s => s.type !== 'none' && s.text.toLowerCase().includes(prizeTitle.slice(0, 8)))
        }
        if (foundIdx < 0) {
          foundIdx = slices.findIndex(s => s.type !== 'none')
        }
        targetIdx = foundIdx >= 0 ? foundIdx : 0
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

    // 3. Rotación matemática
    const segmentMid  = targetIdx * arc + arc / 2
    const currentNorm = ((angleRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    let   needed      = ((0 - segmentMid - currentNorm) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
    if (needed < 0.01) needed += 2 * Math.PI
    const totalRot = 10 * 2 * Math.PI + needed

    const dur = 6500
    const t0  = performance.now()
    const a0  = angleRef.current
    const cv  = canvasRef.current!
    const ctx = cv.getContext('2d')!

    const frame = (now: number) => {
      if (spinIdRef.current !== spinId) return

      const t = Math.min((now - t0) / dur, 1)
      angleRef.current = a0 + totalRot * easeOut(t)
      drawWheel(ctx, angleRef.current, cupcakeRef.current, slices)

      const newPins = getPinsPassed(angleRef.current)
      if (newPins !== lastPinRef.current) {
        lastPinRef.current = newPins
        const speed   = totalRot * 4 * Math.pow(1 - t, 3) / dur * 1000
        const bendAmt = -Math.min(18, speed * 1.5)
        animatePointer(bendAmt)
        setTimeout(() => animatePointer(0), 70 + (1 - t) * 140)
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame)
        return
      }

      angleRef.current = a0 + totalRot
      drawWheel(ctx, angleRef.current, cupcakeRef.current, slices)
      spinningRef.current = false
      setSpinning(false)
      animatePointer(0)

      setResult({
        slice: finalSlice,
        apiResult,
        isWon: isActuallyWon
      })
    }

    rafRef.current = requestAnimationFrame(frame)
  }, [localSpins, slices, arc, onPlay, animatePointer])

  useEffect(() => () => {
    if (rafRef.current)    cancelAnimationFrame(rafRef.current)
    if (ptrRafRef.current) cancelAnimationFrame(ptrRafRef.current)
  }, [])

  return (
    <div className="roulette-container">
      <div className="roulette-wheel-wrapper">
        <canvas
          ref={canvasRef}
          width={ROULETTE_SZ}
          height={ROULETTE_SZ}
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
    </div>
  )
}
