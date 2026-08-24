import { useState, useEffect, lazy, Suspense } from 'react'
import { Navbar } from './components/Navbar'
import { BottomNav } from './components/BottomNav'
import { Wallet } from './components/wallet/Wallet'
import { GameCenter } from './components/games/GameCenter'
import { ClientProductsCatalog } from './components/products/ClientProductsCatalog'
import { AuthModal } from './components/auth/AuthModal'
import { useAuth } from './hooks/useAuth'
import { useAppData } from './hooks/useAppData'
import { ToastProvider } from './context/ToastContext'

// Lazy loading diferido para componentes administrativos pesados (QR Scanner, Metrics, etc.)
const AdminLayout = lazy(() =>
  import('./components/admin/AdminLayout').then(m => ({ default: m.AdminLayout }))
)
const AdminAuthGate = lazy(() =>
  import('./components/admin/AdminAuthGate').then(m => ({ default: m.AdminAuthGate }))
)

function AdminLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FFF9F2] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-orange-100 border-2 border-orange-300 flex items-center justify-center animate-spin">
        <span className="text-2xl">🥕</span>
      </div>
      <p className="text-sm font-bold text-gray-800">Cargando panel de administración...</p>
    </div>
  )
}

export function AppContent() {
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  )
  const [currentView, setCurrentView] = useState<'wallet' | 'productos' | 'games'>('wallet')

  const {
    currentUser,
    setCurrentUser,
    isAuthModalOpen,
    authModalMode,
    openLogin,
    openRegister,
    closeAuthModal,
    handleLogout,
  } = useAuth()

  const {
    allUsers,
    prizes,
    coupons,
    refreshAppData,
    handlePlayGame,
    handleAuthSuccess,
  } = useAppData(currentUser, setCurrentUser)

  // Escuchar navegación del historial del navegador
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin')
    setCurrentPath('/admin')
  }

  const navigateToClient = () => {
    window.history.pushState({}, '', '/')
    setCurrentPath('/')
    setCurrentView('wallet')
  }

  // 1. RUTA /admin -> Panel Administrativo (Protegido por Rol)
  if (currentPath === '/admin') {
    if (currentUser.role !== 'admin') {
      return (
        <Suspense fallback={<AdminLoadingFallback />}>
          <AdminAuthGate
            onSuccess={(user, userCoupons) => {
              handleAuthSuccess(user, userCoupons)
              refreshAppData()
            }}
            onReturnToApp={navigateToClient}
          />
        </Suspense>
      )
    }

    return (
      <Suspense fallback={<AdminLoadingFallback />}>
        <AdminLayout
          adminUser={currentUser}
          allUsers={allUsers}
          prizes={prizes}
          onRefreshUsers={refreshAppData}
          onNavigateToClient={navigateToClient}
        />
      </Suspense>
    )
  }

  const currentUserCoupons = coupons.filter(
    c => c.user_id === currentUser.id || (c as any).usuario_id === currentUser.id
  )

  // 2. RUTA / -> App del Cliente Móvil
  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#1E1E24] flex flex-col font-sans selection:bg-[#F56B2A] selection:text-white">
      {/* Barra de Navegación Superior */}
      <Navbar
        currentUser={currentUser}
        onOpenLogin={openLogin}
        onOpenRegister={openRegister}
        onLogout={handleLogout}
        onNavigateToAdmin={navigateToAdmin}
      />

      {/* Vistas Principales */}
      <main className="flex-1 w-full max-w-md mx-auto">
        {currentView === 'wallet' && (
          <Wallet
            userProfile={currentUser}
            coupons={currentUserCoupons}
            onOpenGames={() => setCurrentView('games')}
            onOpenAuth={openLogin}
            onOpenLogin={openLogin}
            onOpenRegister={openRegister}
            onOpenProducts={() => setCurrentView('productos')}
            onRewardClaimed={refreshAppData}
          />
        )}

        {currentView === 'productos' && (
          <ClientProductsCatalog
            currentUser={currentUser}
            onOpenGames={() => setCurrentView('games')}
          />
        )}

        {currentView === 'games' && (
          <GameCenter
            userProfile={currentUser}
            prizes={prizes}
            onPlayGame={handlePlayGame}
            onOpenLogin={openLogin}
            onOpenRegister={openRegister}
            onOpenProducts={() => setCurrentView('productos')}
          />
        )}
      </main>

      {/* Barra de Navegación Inferior */}
      <BottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        spinsAvailable={currentUser.spins_available}
      />

      {/* Modal de Autenticación */}
      <AuthModal
        isOpen={isAuthModalOpen}
        mode={authModalMode}
        onClose={closeAuthModal}
        onSuccess={handleAuthSuccess}
      />
    </div>
  )
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
