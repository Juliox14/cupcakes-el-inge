import React, { useState } from 'react'
import { Roulette } from './Roulette'
import { Construction, Sparkles, LogIn, UserPlus } from 'lucide-react'
import type { UserProfile, PlayGameResult, Prize } from '../../types'

interface GameCenterProps {
  userProfile: UserProfile
  prizes?: Prize[]
  onPlayGame: (gameType: 'roulette' | 'scratch' | 'slots') => Promise<PlayGameResult>
  onOpenLogin?: () => void
  onOpenRegister?: () => void
  onOpenProducts?: () => void
}

export const GameCenter: React.FC<GameCenterProps> = ({ 
  userProfile, 
  prizes = [], 
  onPlayGame,
  onOpenLogin,
  onOpenRegister,
  onOpenProducts,
}) => {
  const [activeTab, setActiveTab] = useState<'roulette' | 'scratch' | 'slots'>('roulette')

  const isGuest = !userProfile?.id || userProfile.id === 'guest'

  if (isGuest) {
    return (
      <div 
        className="relative min-h-[calc(100vh-120px)] px-4 py-8 pb-24 flex items-center justify-center bg-no-repeat bg-cover bg-center"
        style={{ backgroundImage: `url('/fondo-patron-zanahorias.png')` }}
      >
        <div className="relative z-10 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 text-center shadow-xl border-2 border-orange-200 space-y-4 animate-fade-in">
          <div className="w-16 h-16 bg-orange-100 text-[#F56B2A] rounded-2xl flex items-center justify-center mx-auto shadow-inner text-3xl">
            🎡
          </div>
          <div className="space-y-1.5">
            <h3 className="font-heading font-black text-xl text-gray-900">
              ¡Gira la Ruleta y Gana!
            </h3>
            <p className="text-xs text-gray-600">
              Inicia sesión o crea tu cuenta gratis para que tus tiradas y cupones de premio se guarden en tu tarjeta digital 🥕✨
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={onOpenLogin}
              className="w-full py-3 px-4 rounded-2xl bg-[#F56B2A] hover:bg-[#E65100] text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <LogIn size={16} />
              <span>Iniciar Sesión</span>
            </button>
            <button
              onClick={onOpenRegister}
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-orange-50 text-gray-900 font-heading font-bold text-xs uppercase tracking-wider border-2 border-orange-200 shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <UserPlus size={16} className="text-[#F56B2A]" />
              <span>Crear Cuenta Gratis</span>
            </button>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={onOpenProducts}
              className="text-xs text-[#0A2540] font-bold hover:underline cursor-pointer"
            >
              O consultar menú de encargos →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="relative min-h-[calc(100vh-120px)] px-4 py-4 pb-24 overflow-hidden bg-no-repeat bg-cover bg-center"
      style={{
        backgroundImage: `url('/fondo-patron-zanahorias.png')`,
      }}
    >
      {/* Selector de Pestañas de Juegos */}
      <div className="relative z-10 max-w-sm mx-auto bg-white/90 backdrop-blur p-1 rounded-2xl border border-orange-200/60 shadow-sm flex items-center mb-4">
        <button
          onClick={() => setActiveTab('roulette')}
          className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition ${
            activeTab === 'roulette' ? 'bg-[#F56B2A] text-white shadow' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Ruleta 🎡
        </button>
        <button
          onClick={() => setActiveTab('scratch')}
          className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition ${
            activeTab === 'scratch' ? 'bg-[#F56B2A] text-white shadow' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Raspa y Gana 🎟️
        </button>
        <button
          onClick={() => setActiveTab('slots')}
          className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition ${
            activeTab === 'slots' ? 'bg-[#F56B2A] text-white shadow' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Tragamonedas 🎰
        </button>
      </div>

      {/* Vista del Minijuego Seleccionado */}
      <div className="relative z-10">
        {activeTab === 'roulette' && (
          <Roulette 
            spinsAvailable={userProfile.spins_available} 
            prizes={prizes}
            onPlay={onPlayGame} 
          />
        )}

        {/* Pantalla en Construcción para Raspa y Gana */}
        {activeTab === 'scratch' && (
          <div className="max-w-sm mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-8 text-center shadow-xl border-2 border-orange-200 space-y-4 animate-fade-in my-6">
            <div className="w-16 h-16 bg-orange-100 text-[#F56B2A] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Construction size={32} />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-heading font-black text-xl text-gray-900">
                ¡Próximamente! 🎟️
              </h3>
              <p className="font-bold text-xs text-[#F56B2A]">
                Esta sección aún se encuentra en construcción.
              </p>
              <p className="text-xs text-gray-600 pt-1">
                Estamos horneando este minijuego artesanal para ti. Mientras tanto, ¡consigue oportunidades y diviértete girando la Ruleta de la Suerte! 🥕✨
              </p>
            </div>

            <button
              onClick={() => setActiveTab('roulette')}
              className="w-full py-3 px-4 rounded-2xl bg-[#F56B2A] hover:bg-[#E65100] text-white font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2"
            >
              <Sparkles size={15} />
              <span>Jugar a la Ruleta</span>
            </button>
          </div>
        )}

        {/* Pantalla en Construcción para Tragamonedas */}
        {activeTab === 'slots' && (
          <div className="max-w-sm mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-8 text-center shadow-xl border-2 border-orange-200 space-y-4 animate-fade-in my-6">
            <div className="w-16 h-16 bg-orange-100 text-[#F56B2A] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Construction size={32} />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-heading font-black text-xl text-gray-900">
                ¡Próximamente! 🎰
              </h3>
              <p className="font-bold text-xs text-[#F56B2A]">
                Esta sección aún se encuentra en construcción.
              </p>
              <p className="text-xs text-gray-600 pt-1">
                Estamos preparando la mejor máquina de cupcakes con premios increíbles. ¡Gira la Ruleta de la Suerte hoy mismo! 🥕✨
              </p>
            </div>

            <button
              onClick={() => setActiveTab('roulette')}
              className="w-full py-3 px-4 rounded-2xl bg-[#F56B2A] hover:bg-[#E65100] text-white font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2"
            >
              <Sparkles size={15} />
              <span>Jugar a la Ruleta</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
