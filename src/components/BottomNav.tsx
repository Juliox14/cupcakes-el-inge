import React from 'react'
import { ShoppingBag, Dices } from 'lucide-react'

interface BottomNavProps {
  currentView: 'wallet' | 'productos' | 'games' | string
  setCurrentView: (view: any) => void
  spinsAvailable: number
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  setCurrentView,
  spinsAvailable,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg max-w-md mx-auto">
      <div className="flex items-center justify-around py-2">
        {/* Tab 1: Inicio (Wallet) */}
        <button
          onClick={() => setCurrentView('wallet')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            currentView === 'wallet'
              ? 'text-gray-900 font-bold'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center mb-0.5">
            <img 
              src="/cupcake-color.png" 
              alt="Inicio" 
              className={`w-5 h-5 object-contain transition ${currentView === 'wallet' ? 'opacity-100 scale-110' : 'opacity-40 grayscale'}`} 
            />
          </div>
          <span className="text-[11px] font-medium tracking-tight">Inicio</span>
        </button>

        {/* Tab 2: Encargos & Catálogo Libre */}
        <button
          onClick={() => setCurrentView('productos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            currentView === 'productos'
              ? 'text-gray-900 font-bold'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center mb-0.5">
            <ShoppingBag size={20} className={currentView === 'productos' ? 'text-[#F56B2A]' : 'text-gray-400'} />
          </div>
          <span className="text-[11px] font-medium tracking-tight">Encargos</span>
        </button>

        {/* Tab 3: Juegos */}
        <button
          onClick={() => setCurrentView('games')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition relative ${
            currentView === 'games'
              ? 'text-gray-900 font-bold'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center mb-0.5">
            <Dices size={20} className={currentView === 'games' ? 'text-gray-900' : 'text-gray-400'} />
          </div>
          <span className="text-[11px] font-medium tracking-tight">Juegos</span>
          {spinsAvailable > 0 && (
            <span className="absolute top-1 right-8 bg-[#D32F2F] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
              {spinsAvailable}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
