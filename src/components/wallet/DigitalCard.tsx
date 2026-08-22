import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { UserProfile } from '../../types'

interface DigitalCardProps {
  userProfile: UserProfile
  onOpenAuth?: () => void
}

export const DigitalCard: React.FC<DigitalCardProps> = ({ userProfile, onOpenAuth }) => {
  const ingeId = userProfile.phone 
    ? `INGE-${userProfile.phone.slice(-4)}`
    : `DYLH${userProfile.id.slice(-2).toUpperCase()}`

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const clientQrPayload = `${origin}/admin?scan=INGE-CLIENT:${userProfile.phone || '0000000000'}:${userProfile.id}`

  return (
    <div className="relative w-full max-w-[480px] mx-auto">
      {/* Imagen base de Figma */}
      <img
        src="/tarjeta-dual.png"
        alt="Tarjeta Digital El Inge"
        className="w-full h-auto block drop-shadow-2xl"
      />

      {/* Overlay de datos del cliente y QR de caja */}
      <div className="absolute inset-0 flex items-center justify-between px-5 py-6 pointer-events-none">
        <div 
          onClick={onOpenAuth}
          className="space-y-0.5 pointer-events-auto self-end mb-0.5 cursor-pointer hover:opacity-85 transition"
          title="Toca para cambiar de usuario o registrarte"
        >
          <p className="text-xs sm:text-sm font-sans font-medium text-black/95 leading-tight m-0">
            Hola <strong className="font-bold text-black text-sm sm:text-base ml-1">{userProfile.full_name.split(' ')[0]}</strong>
          </p>
          <p className="text-[10px] sm:text-xs font-mono text-black/85 tracking-wide m-0">
            IngID: {ingeId}
          </p>
        </div>

        <div className="pointer-events-auto flex items-center justify-center shrink-0 pr-2">
          <div className="p-1 bg-white rounded-lg shadow-sm">
            <QRCodeSVG
              value={clientQrPayload}
              size={100}
              bgColor="#FFFFFF"
              fgColor="#1E1E24"
              level="M"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
