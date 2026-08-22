import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface SlideOverProps {
  isOpen: boolean
  onClose: () => void
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}

export const SlideOver: React.FC<SlideOverProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  maxWidth = 'max-w-md',
}) => {
  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop con desenfoque como en SIPAD */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className={`w-screen ${maxWidth} bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out border-l border-gray-200`}>
          {/* Header del Slide-over (Estilo SIPAD) */}
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5 text-[#0A2540]">
              {icon && <div className="text-[#0A2540]">{icon}</div>}
              <h3 className="font-bold text-base text-gray-900 leading-tight">
                {title}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100 transition"
              aria-label="Cerrar panel"
            >
              <X size={18} />
            </button>
          </div>

          {/* Cuerpo con Scroll */}
          <div className="flex-1 px-6 py-5 overflow-y-auto space-y-4 text-sm">
            {children}
          </div>

          {/* Footer Fijo en la Base */}
          {footer && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/80 flex items-center justify-end gap-3 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
