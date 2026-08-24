import React, { useRef, useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { RefreshCw } from 'lucide-react'
import type { PlayGameResult } from '../../types'
import { toast } from '../../context/ToastContext'

interface ScratchCardProps {
  spinsAvailable: number
  onPlay: (gameType: 'scratch') => Promise<PlayGameResult>
}

export const ScratchCard: React.FC<ScratchCardProps> = ({ spinsAvailable, onPlay }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [gameResult, setGameResult] = useState<PlayGameResult | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isScratched, setIsScratched] = useState(false)

  const startScratchCard = async () => {
    if (isPlaying || spinsAvailable <= 0) return
    setIsPlaying(true)
    setIsScratched(false)
    setGameResult(null)

    try {
      const res = await onPlay('scratch')
      setGameResult(res)
      setIsPlaying(false)
      initCanvas()
    } catch (err: any) {
      setIsPlaying(false)
      const msg = err.message || 'Error al iniciar el Rasca y Gana.'
      toast.error('Error en Rasca y Gana', msg)
    }
  }

  const initCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Capa de rascar estilo betún suave
    ctx.fillStyle = '#E8F5E9'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#2E7D32'
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('✨ RASCA AQUÍ CON TU DEDO ✨', canvas.width / 2, canvas.height / 2 + 5)
  }

  useEffect(() => {
    if (gameResult && canvasRef.current) {
      initCanvas()
    }
  }, [gameResult])

  const handleScratch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!gameResult || isScratched) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let clientX = 0
    let clientY = 0

    if ('touches' in e && e.touches[0]) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if ('clientX' in e) {
      clientX = e.clientX
      clientY = e.clientY
    }

    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 24, 0, Math.PI * 2)
    ctx.fill()

    checkScratchPercentage()
  }

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current
    if (!canvas || isScratched) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let transparentPixels = 0

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparentPixels++
    }

    const percentage = (transparentPixels / (pixels.length / 4)) * 100
    if (percentage > 40 && !isScratched) {
      setIsScratched(true)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (gameResult?.won) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#F56B2A', '#D32F2F', '#2E7D32', '#FFD54F']
        })
      }
    }
  }

  return (
    <div className="flex flex-col items-center text-center space-y-4 max-w-sm mx-auto">
      {/* Título & Subtítulo estilo Figma */}
      <div className="space-y-2">
        <h2 className="font-heading font-black text-2xl tracking-wide text-gray-900 leading-tight">
          Raspa y Gana
        </h2>
        <p className="text-xs text-gray-600 leading-relaxed px-4 font-sans">
          Rasca y descubre si has sido ganador, podrás conseguir premios, promociones o descuentos en tus próximas compras.
        </p>
      </div>

      {/* Tarjeta Marco Verde Claro (Figma Style) */}
      <div className="w-72 rounded-3xl bg-[#D8E6C3] p-4 shadow-xl border-4 border-white space-y-3 relative overflow-hidden">
        {/* Header con el Logo letras.png */}
        <div className="flex justify-center pt-1 pb-2">
          <img src="/letras.png" alt="El Inge" className="h-7 object-contain" />
        </div>

        {/* Recuadro de Rascar Canvas / Superficie */}
        <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-white shadow-inner flex items-center justify-center border-2 border-[#C5D8AE]">
          {gameResult ? (
            <div className="p-4 text-center space-y-2">
              <div className="text-3xl">{gameResult.won ? '🎉' : '🥕'}</div>
              <h4 className="font-bold text-sm text-gray-900">
                {gameResult.won ? gameResult.prize.title : '¡Sigue Intentando!'}
              </h4>
              <p className="text-xs text-gray-600 px-2">{gameResult.message}</p>
            </div>
          ) : (
            <div className="text-center p-4 text-gray-400">
              <p className="text-xs font-medium">Presiona el botón para raspar tu tarjeta</p>
            </div>
          )}

          {gameResult && !isScratched && (
            <canvas
              ref={canvasRef}
              width={256}
              height={176}
              onMouseMove={handleScratch}
              onTouchMove={handleScratch}
              className="absolute inset-0 w-full h-full cursor-pointer touch-none"
            />
          )}
        </div>
      </div>

      {/* Botón Principal Verde (Figma Style) */}
      <button
        onClick={startScratchCard}
        disabled={isPlaying || spinsAvailable <= 0}
        className={`w-full max-w-xs py-3.5 px-6 rounded-2xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
          spinsAvailable > 0 && !isPlaying
            ? 'bg-[#2E7D32] hover:bg-[#1B5E20] text-white active:scale-95'
            : 'bg-gray-400 text-white cursor-not-allowed'
        }`}
      >
        {isPlaying ? (
          <>
            <RefreshCw className="animate-spin" size={18} />
            Obteniendo...
          </>
        ) : (
          'Raspar tarjeta'
        )}
      </button>
    </div>
  )
}
