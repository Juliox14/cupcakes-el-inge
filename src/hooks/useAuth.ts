import { useState, useCallback } from 'react'
import type { UserProfile } from '../types'
import { logoutUserApi } from '../services'

const GUEST_USER: UserProfile = {
  id: 'guest',
  full_name: 'Invitado',
  role: 'client',
  spins_available: 0,
  total_cupcakes_purchased: 0,
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(GUEST_USER)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login')

  const openLogin = useCallback(() => {
    setAuthModalMode('login')
    setIsAuthModalOpen(true)
  }, [])

  const openRegister = useCallback(() => {
    setAuthModalMode('register')
    setIsAuthModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false)
  }, [])

  const handleLogout = useCallback(async () => {
    await logoutUserApi()
    setCurrentUser(GUEST_USER)
  }, [])

  const updateCurrentUser = useCallback((user: Partial<UserProfile>) => {
    setCurrentUser(prev => ({ ...prev, ...user }))
  }, [])

  return {
    currentUser,
    setCurrentUser,
    updateCurrentUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    openLogin,
    openRegister,
    closeAuthModal,
    handleLogout,
  }
}
