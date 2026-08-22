import React, { useState } from 'react'
import { QRScannerModal } from './QRScannerModal'
import { QrCode, ArrowLeft, Shield } from 'lucide-react'
import type { UserProfile } from '../../types'

interface AdminMobileScannerProps {
  adminUser: UserProfile
  allUsers: UserProfile[]
  onReturnToWallet: () => void
  onRefreshData: () => void
}

export const AdminMobileScanner: React.FC<AdminMobileScannerProps> = ({
  adminUser,
  allUsers,
  onReturnToWallet,
  onRefreshData,
}) => {
  const [showScanner, setShowScanner] = useState(true)

  return (
    <div className="min-h-screen bg-[#1E1E24] text-white flex flex-col p-4 max-w-md mx-auto">
      {/* Header Móvil */}
      <div className="flex items-center justify-between py-3 border-b border-gray-800">
        <button
          onClick={onReturnToWallet}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={16} />
          <span>Volver a la App</span>
        </button>

        <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-800 text-red-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
          <Shield size={12} />
          <span>Modo Caja Móvil</span>
        </div>
      </div>

      {/* Tarjeta Principal de Escaneo */}
      <div className="flex-1 flex flex-col items-center justify-center text-center py-8 space-y-6">
        <div className="w-20 h-20 bg-orange-500/10 border-2 border-orange-500 rounded-3xl flex items-center justify-center text-[#F56B2A] shadow-xl shadow-orange-500/10 animate-pulse">
          <QrCode size={40} />
        </div>

        <div className="space-y-1.5">
          <h2 className="font-heading font-black text-2xl text-white">Escáner de Mostrador 🥕</h2>
          <p className="text-xs text-gray-400 max-w-xs">
            Escanea el código QR de la Tarjeta Dual del cliente para registrar su compra y otorgarle jugadas, o canjea sus cupones de premio.
          </p>
        </div>

        <button
          onClick={() => setShowScanner(true)}
          className="w-full max-w-xs py-4 px-6 rounded-2xl bg-[#F56B2A] hover:bg-[#E65100] text-white font-heading font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/30 transition flex items-center justify-center gap-2 active:scale-98"
        >
          <QrCode size={20} />
          <span>Abrir Escáner de Cámara</span>
        </button>
      </div>

      {/* Scanner Modal Integrado */}
      {showScanner && (
        <QRScannerModal
          adminId={adminUser.id}
          allUsers={allUsers}
          onClose={() => setShowScanner(false)}
          onRedeemedSuccess={() => {
            onRefreshData()
          }}
          onPurchaseSuccess={() => {
            onRefreshData()
          }}
        />
      )}
    </div>
  )
}
