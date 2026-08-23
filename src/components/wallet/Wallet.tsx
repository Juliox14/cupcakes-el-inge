import React, { useState } from 'react'
import type { UserProfile, Coupon } from '../../types'
import { DigitalCard } from './DigitalCard'
import { WeeklyLoyalty } from './WeeklyLoyalty'
import { CouponCard } from './CouponCard'
import { CouponQRModal } from './CouponQRModal'
import { WalletAuthPrompt } from './WalletAuthPrompt'

export interface WalletProps {
  userProfile: UserProfile
  coupons: Coupon[]
  onOpenGames: () => void
  onOpenAuth?: () => void
  onOpenLogin?: () => void
  onOpenRegister?: () => void
  onOpenProducts?: () => void
  onRewardClaimed?: () => void
}

export const Wallet: React.FC<WalletProps> = ({
  userProfile,
  coupons,
  onOpenGames,
  onOpenAuth,
  onOpenLogin,
  onOpenRegister,
  onOpenProducts,
  onRewardClaimed,
}) => {
  const [selectedQR, setSelectedQR] = useState<Coupon | null>(null)

  const isGuest = !userProfile?.id || userProfile.id === 'guest'

  // Si no está autenticado, mostrar únicamente la pantalla de registro / login y enlace a encargos
  if (isGuest) {
    return (
      <WalletAuthPrompt
        onOpenLogin={onOpenLogin || onOpenAuth || (() => {})}
        onOpenRegister={onOpenRegister || onOpenAuth || (() => {})}
        onOpenProducts={onOpenProducts || (() => {})}
      />
    )
  }

  const activeCoupons = coupons.filter(
    c => c.status === 'active' || (c.status as string) === 'activo' || (c as any).estado === 'activo'
  )

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-24 space-y-6">
      {/* 1. Tarjeta digital dual (Figma + QR de Cliente) */}
      <DigitalCard userProfile={userProfile} onOpenAuth={onOpenAuth} />

      {/* 2. Barra de lealtad semanal (5 cupcakes y botón verde) */}
      <WeeklyLoyalty
        userProfile={userProfile}
        onOpenGames={onOpenGames}
        onRewardClaimed={onRewardClaimed}
      />

      {/* 3. Sección "Mis cupones" */}
      <div className="space-y-3">
        <h3 className="font-sans font-bold text-sm text-gray-900">
          Mis cupones
        </h3>

        {activeCoupons.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {activeCoupons.map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                onSelect={setSelectedQR}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-orange-300 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#F56B2A] flex items-center justify-center mx-auto shadow-inner text-2xl">
              🎟️
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-gray-900">
                No tienes cupones disponibles
              </h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Compra cupcakes y consigue oportunidades para jugar en la ruleta y ganar premios exclusivos 🥕✨
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Modal para ver QR ampliado del cupón */}
      <CouponQRModal
        coupon={selectedQR}
        onClose={() => setSelectedQR(null)}
      />
    </div>
  )
}
