import React, { useState } from 'react'
import { LogOut, Shield, LogIn, ChevronDown } from 'lucide-react'
import type { UserProfile } from '../types'
import { logoutUserApi } from '../lib/api'

interface NavbarProps {
  currentView?: 'wallet' | 'promociones' | 'games' | 'admin'
  setCurrentView?: (view: 'wallet' | 'promociones' | 'games' | 'admin') => void
  currentUser?: UserProfile
  userProfile?: UserProfile
  setUserProfile?: (profile: UserProfile) => void
  onOpenLogin?: () => void
  onOpenRegister?: () => void
  onOpenAuth?: () => void
  onLogout?: () => Promise<void> | void
  onNavigateToAdmin?: () => void
  onNavigateToAdminRoute?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  userProfile,
  currentUser,
  setUserProfile,
  setCurrentView,
  onOpenLogin,
  onOpenAuth,
  onLogout,
  onNavigateToAdmin,
  onNavigateToAdminRoute,
}) => {
  const profile = currentUser || userProfile || {
    id: 'guest',
    full_name: 'Invitado',
    role: 'client' as const,
    spins_available: 0,
    total_cupcakes_purchased: 0,
  }
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const isGuest = !profile.phone || profile.phone === '0000000000' || profile.full_name === 'Invitado'

  const handleOpenAuthModal = onOpenLogin || onOpenAuth || (() => {})
  const handleNavAdmin = onNavigateToAdmin || onNavigateToAdminRoute || (() => {})

  // Cerrar sesión
  const handleLogoutAction = async () => {
    if (onLogout) {
      await onLogout()
    } else {
      try {
        await logoutUserApi()
      } catch {
        // Continuar
      }
    }
    if (setUserProfile) {
      const guestUser: UserProfile = {
        id: `guest-${Date.now()}`,
        full_name: 'Invitado',
        phone: '0000000000',
        role: 'client',
        spins_available: 0,
        total_cupcakes_purchased: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setUserProfile(guestUser)
    }
    setShowProfileMenu(false)
    if (setCurrentView) setCurrentView('wallet')
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-xs">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo Centrado: letras.png */}
        <div 
          onClick={() => {
            if (setCurrentView) setCurrentView('wallet')
            window.history.pushState({}, '', '/')
          }}
          className="flex items-center cursor-pointer"
        >
          <img 
            src="/letras.webp" 
            alt="EL INGE - CUPCAKES DE ZANAHORIA" 
            width={109}
            height={32}
            className="h-8 w-auto object-contain"
            decoding="async"
          />
        </div>

        {/* Acceso de Usuario a la Derecha */}
        <div className="relative">
          {isGuest ? (
            <button
              onClick={handleOpenAuthModal}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#F56B2A] to-[#E65100] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <LogIn size={14} />
              <span>Iniciar Sesión</span>
            </button>
          ) : (
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-1.5 p-1 pr-2.5 rounded-full bg-orange-50 border border-orange-200 hover:bg-orange-100 transition cursor-pointer text-gray-800"
            >
              <div className="w-7 h-7 rounded-full bg-[#F56B2A] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold truncate max-w-[80px]">
                {profile.full_name.split(' ')[0]}
              </span>
              <ChevronDown size={13} className="text-gray-500" />
            </button>
          )}

          {/* Menú Flotante de Usuario Logueado */}
          {showProfileMenu && !isGuest && (
            <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 text-xs text-gray-800 z-50 animate-fade-in space-y-1">
              <div className="px-3.5 py-2 border-b border-gray-100">
                <p className="font-bold text-gray-900 truncate">{profile.full_name}</p>
                <p className="text-[10px] text-gray-500 font-mono">{profile.phone || profile.email}</p>
              </div>

              {profile.role === 'admin' && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    handleNavAdmin()
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-orange-50 text-[#F56B2A] font-bold flex items-center gap-2 transition cursor-pointer"
                >
                  <Shield size={14} />
                  <span>Panel Admin (/admin)</span>
                </button>
              )}

              <button
                onClick={handleLogoutAction}
                className="w-full px-3.5 py-2 text-left hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <LogOut size={14} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
