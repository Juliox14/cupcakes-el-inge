import React, { useState } from 'react'
import confetti from 'canvas-confetti'
import { RefreshCw } from 'lucide-react'
import type { PlayGameResult } from '../../types'

interface SlotMachineProps {
  spinsAvailable: number
  onPlay: (gameType: 'slots') => Promise<PlayGameResult>
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ spinsAvailable, onPlay }) => {
  const [spinning, setSpinning] = useState(false)
  const [reels, setReels] = useState(['/cupcake-color.png', '/cupcake-color.png', '/cupcake-color.png'])
  const [result, setResult] = useState<PlayGameResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSpin = async () => {
    if (spinning || spinsAvailable <= 0) return

    setSpinning(true)
    setErrorMsg(null)
    setResult(null)

    // Animación de rodillos girando
    const interval = setInterval(() => {
      setReels([
        Math.random() > 0.5 ? '/cupcake-color.png' : '/cupcake-gris.png',
        Math.random() > 0.5 ? '/cupcake-color.png' : '/cupcake-gris.png',
        Math.random() > 0.5 ? '/cupcake-color.png' : '/cupcake-gris.png',
      ])
    }, 100)

    try {
      const res = await onPlay('slots')
      
      setTimeout(() => {
        clearInterval(interval)
        setSpinning(false)

        if (res.won) {
          setReels(['/cupcake-color.png', '/cupcake-color.png', '/cupcake-color.png'])
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#F56B2A', '#D32F2F', '#2E7D32', '#FFD54F']
          })
        } else {
          setReels(['/cupcake-color.png', '/cupcake-gris.png', '/cupcake-color.png'])
        }

        setResult(res)
      }, 2500)

    } catch (err: any) {
      clearInterval(interval)
      setSpinning(false)
      setErrorMsg(err.message || 'Error al accionar la tragamonedas.')
    }
  }

  return (
    <div className="flex flex-col items-center text-center space-y-4 max-w-sm mx-auto">
      {/* Título & Subtítulo estilo Figma */}
      <div className="space-y-2">
        <h2 className="font-heading font-black text-2xl tracking-wide text-gray-900 leading-tight">
          Tragamonedas
        </h2>
        <p className="text-xs text-gray-600 leading-relaxed px-4 font-sans">
          ¡Jala la palanca para ganar premios, promociones o descuentos en tus próximas compras!
        </p>
      </div>

      {/* Máquina Tragamonedas Gráfica (Figma Replica) */}
      <div className="relative my-2">
        {/* Palanca de la derecha */}
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col items-center z-20">
          {/* Bola roja de la palanca */}
          <div className={`w-6 h-6 rounded-full bg-red-600 shadow-md border-2 border-red-800 transition-transform duration-300 ${
            spinning ? 'translate-y-8' : ''
          }`} />
          {/* Palo dorado/madera */}
          <div className="w-2 h-14 bg-gradient-to-b from-amber-400 to-amber-700 rounded-full border border-amber-900" />
        </div>

        {/* Carcasa Principal de la Máquina */}
        <div className="w-72 bg-[#B71C1C] rounded-3xl p-4 border-4 border-[#7F0000] shadow-2xl space-y-3">
          {/* Marquesina superior con bombillas amarillas y 3 zanahorias */}
          <div className="bg-[#8E0000] rounded-2xl p-2.5 border-2 border-amber-400/60 flex items-center justify-around shadow-inner">
            <span className="text-xl">🥕</span>
            <span className="text-xl">🥕</span>
            <span className="text-xl">🥕</span>
          </div>

          {/* Ventana de Rodillos con Fondo Blanco */}
          <div className="bg-white rounded-2xl p-3 flex justify-between gap-2 border-4 border-gray-900 shadow-inner">
            {reels.map((src, idx) => (
              <div
                key={idx}
                className={`w-16 h-20 rounded-xl bg-gradient-to-b from-gray-50 to-gray-100 border-2 border-gray-200 flex items-center justify-center p-1 shadow-sm ${
                  spinning ? 'animate-pulse' : ''
                }`}
              >
                <img src={src} alt="Cupcake" className="w-12 h-12 object-contain" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Botón Principal Verde (Figma Replica) */}
      <button
        onClick={handleSpin}
        disabled={spinning || spinsAvailable <= 0}
        className={`w-full max-w-xs py-3.5 px-6 rounded-2xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
          spinsAvailable > 0 && !spinning
            ? 'bg-[#2E7D32] hover:bg-[#1B5E20] text-white active:scale-95'
            : 'bg-gray-400 text-white cursor-not-allowed'
        }`}
      >
        {spinning ? (
          <>
            <RefreshCw className="animate-spin" size={18} />
            Girando...
          </>
        ) : (
          'Jalar la palanca'
        )}
      </button>

      {errorMsg && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-700 text-xs rounded-xl w-full">
          {errorMsg}
        </div>
      )}

      {result && (
        <div className={`p-4 rounded-2xl w-full text-center space-y-1.5 border-2 ${
          result.won ? 'bg-orange-50 border-[#F56B2A] text-gray-900' : 'bg-gray-100 border-gray-300 text-gray-700'
        }`}>
          <div className="text-2xl">{result.won ? '🎉' : '🥕'}</div>
          <h4 className="font-bold text-sm">
            {result.won ? '¡TRIPLE COMBINACIÓN GANADORA!' : '¡Sigue intentando!'}
          </h4>
          <p className="text-xs text-gray-600">{result.message}</p>
        </div>
      )}
    </div>
  )
}
