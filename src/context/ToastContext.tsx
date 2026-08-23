import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Check, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  title: string
  description?: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  showToast: (title: string, descriptionOrType?: string | ToastType, typeOrDuration?: ToastType | number, duration?: number) => void
  success: (title: string, description?: string, duration?: number) => void
  error: (title: string, description?: string, duration?: number) => void
  warning: (title: string, description?: string, duration?: number) => void
  info: (title: string, description?: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Handler global para llamadas fuera de componentes React
let globalToastHandler: ((title: string, description?: string, type?: ToastType, duration?: number) => void) | null = null

export const toast = {
  success: (title: string, description?: string, duration?: number) => {
    if (globalToastHandler) globalToastHandler(title, description, 'success', duration)
    else console.log('[TOAST SUCCESS]:', title, description)
  },
  error: (title: string, description?: string, duration?: number) => {
    if (globalToastHandler) globalToastHandler(title, description, 'error', duration)
    else console.error('[TOAST ERROR]:', title, description)
  },
  warning: (title: string, description?: string, duration?: number) => {
    if (globalToastHandler) globalToastHandler(title, description, 'warning', duration)
    else console.warn('[TOAST WARNING]:', title, description)
  },
  info: (title: string, description?: string, duration?: number) => {
    if (globalToastHandler) globalToastHandler(title, description, 'info', duration)
    else console.log('[TOAST INFO]:', title, description)
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((
    title: string,
    descriptionOrType?: string | ToastType,
    typeOrDuration?: ToastType | number,
    duration: number = 3800
  ) => {
    let desc: string | undefined = undefined
    let toastType: ToastType = 'info'
    let finalDuration = duration

    if (descriptionOrType === 'success' || descriptionOrType === 'error' || descriptionOrType === 'warning' || descriptionOrType === 'info') {
      toastType = descriptionOrType
      if (typeof typeOrDuration === 'number') finalDuration = typeOrDuration
    } else {
      desc = descriptionOrType
      if (typeOrDuration === 'success' || typeOrDuration === 'error' || typeOrDuration === 'warning' || typeOrDuration === 'info') {
        toastType = typeOrDuration
      }
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const newToast: ToastItem = { id, title, description: desc, type: toastType, duration: finalDuration }

    setToasts(prev => [newToast, ...prev].slice(0, 3))
  }, [])

  const success = useCallback((title: string, description?: string, duration?: number) => {
    showToast(title, description, 'success', duration)
  }, [showToast])

  const error = useCallback((title: string, description?: string, duration?: number) => {
    showToast(title, description, 'error', duration)
  }, [showToast])

  const warning = useCallback((title: string, description?: string, duration?: number) => {
    showToast(title, description, 'warning', duration)
  }, [showToast])

  const info = useCallback((title: string, description?: string, duration?: number) => {
    showToast(title, description, 'info', duration)
  }, [showToast])

  useEffect(() => {
    globalToastHandler = (title, desc, type, dur) => {
      showToast(title, desc, type || 'info', dur || 3800)
    }
    return () => {
      globalToastHandler = null
    }
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast }}>
      {children}
      {/* Contenedor Superior Central con animación suave */}
      <div 
        className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-3 pointer-events-none w-full max-w-sm sm:max-w-md px-3 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onRemove={() => removeToast(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    return toast
  }
  return context
}

// Componente individual de Tarjeta Toast con el diseño exacto de la imagen
const ToastCard: React.FC<{ item: ToastItem; onRemove: () => void }> = ({ item, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(onRemove, 280)
    }, item.duration || 3800)

    return () => clearTimeout(timer)
  }, [item.duration, onRemove])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(onRemove, 280)
  }

  // Estilos visuales exactos a la imagen
  const config = {
    success: {
      cardBg: 'bg-[#BEE8D0]',
      blobColor: 'bg-[#A8DEC0]',
      titleColor: 'text-[#14261C]',
      descColor: 'text-[#2D5A3E]',
      closeColor: 'text-[#2D5A3E]/60 hover:text-[#14261C]',
      icon: (
        <Check 
          size={22} 
          strokeWidth={3.5} 
          className="text-[#1E7C48]" 
        />
      )
    },
    error: {
      cardBg: 'bg-[#F9CFCF]',
      blobColor: 'bg-[#F4B6B6]',
      titleColor: 'text-[#2E1212]',
      descColor: 'text-[#6E3535]',
      closeColor: 'text-[#6E3535]/60 hover:text-[#2E1212]',
      icon: (
        <span className="text-[#B91C1C] font-black text-2xl leading-none select-none pb-0.5">
          !
        </span>
      )
    },
    warning: {
      cardBg: 'bg-[#FEE4A6]',
      blobColor: 'bg-[#FCD47E]',
      titleColor: 'text-[#2E200B]',
      descColor: 'text-[#784E11]',
      closeColor: 'text-[#784E11]/60 hover:text-[#2E200B]',
      icon: (
        <span className="text-[#B45309] font-black text-2xl leading-none select-none pb-0.5">
          !
        </span>
      )
    },
    info: {
      cardBg: 'bg-[#FFE2D1]',
      blobColor: 'bg-[#FFCCAE]',
      titleColor: 'text-[#2D1B10]',
      descColor: 'text-[#84441F]',
      closeColor: 'text-[#84441F]/60 hover:text-[#2D1B10]',
      icon: (
        <span className="text-[#EA580C] font-black text-xl leading-none select-none">
          i
        </span>
      )
    }
  }[item.type]

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden flex items-center justify-between gap-3.5 w-full p-3.5 sm:px-4 sm:py-3.5 rounded-[24px] sm:rounded-[26px] shadow-lg shadow-black/5 transition-all duration-300 transform ${
        isExiting
          ? 'opacity-0 -translate-y-4 scale-95'
          : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-top-4'
      } ${config.cardBg}`}
      role="alert"
    >
      {/* Manchas/burbujas decorativas orgánicas en el fondo izquierdo */}
      <div 
        className={`absolute -left-5 -top-5 w-20 h-20 rounded-full opacity-60 pointer-events-none ${config.blobColor}`} 
      />
      <div 
        className={`absolute left-3 -bottom-5 w-14 h-14 rounded-full opacity-50 pointer-events-none ${config.blobColor}`} 
      />

      {/* Círculo Blanco con Icono */}
      <div className="relative z-10 w-11 h-11 min-w-[44px] min-h-[44px] bg-white rounded-full flex items-center justify-center shadow-xs shrink-0">
        {config.icon}
      </div>

      {/* Textos: Título en negrita y Descripción/Subtítulo */}
      <div className="relative z-10 flex-1 min-w-0 text-left">
        <h4 className={`font-bold text-sm leading-tight break-words ${config.titleColor}`}>
          {item.title}
        </h4>
        {item.description && (
          <p className={`text-xs leading-snug font-normal mt-0.5 break-words ${config.descColor}`}>
            {item.description}
          </p>
        )}
      </div>

      {/* Botón de Cerrar (X) */}
      <button
        onClick={handleDismiss}
        className={`relative z-10 p-1.5 rounded-lg transition shrink-0 cursor-pointer ${config.closeColor}`}
        aria-label="Cerrar notificación"
      >
        <X size={17} strokeWidth={2.4} />
      </button>
    </div>
  )
}
