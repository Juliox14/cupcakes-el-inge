import React, { useState, useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { 
  X, 
  QrCode, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  User, 
  ShoppingBag, 
  Plus, 
  Minus,
  Phone
} from 'lucide-react'
import { 
  verifyCouponApi, 
  redeemCouponApi, 
  getClientByQueryApi, 
  registerPurchaseApi 
} from '../../lib/api'
import type { Coupon, UserProfile } from '../../types'
import { toast } from '../../context/ToastContext'

interface QRScannerModalProps {
  adminId: string
  allUsers?: UserProfile[]
  onClose: () => void
  onRedeemedSuccess: () => void
  onPurchaseSuccess?: (user: UserProfile, spinsGranted: number) => void
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  adminId,
  allUsers = [],
  onClose,
  onRedeemedSuccess,
  onPurchaseSuccess,
}) => {
  const [manualCode, setManualCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanMode, setScanMode] = useState<'scan' | 'manual'>('scan')
  
  // Estado para cupón
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean
    message: string
    status: string
    coupon?: Coupon
  } | null>(null)
  const [redeeming, setRedeeming] = useState(false)

  // Estado para cliente detectado (Tarjeta Dual)
  const [detectedClient, setDetectedClient] = useState<UserProfile | null>(null)
  const [cupcakesQty, setCupcakesQty] = useState<number>(2)
  const [registeringPurchase, setRegisteringPurchase] = useState(false)

  useEffect(() => {
    if (scanMode !== 'scan') return

    // Inicializar escáner de cámara HTML5
    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 220, height: 220 } },
      /* verbose= */ false
    )

    scanner.render(
      async (decodedText) => {
        scanner.clear().catch(() => {})
        handleProcessDecoded(decodedText)
      },
      () => {
        // frame status ignorado
      }
    )

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [scanMode])

  // Procesar código escaneado o manual
  const handleProcessDecoded = async (text: string) => {
    if (!text.trim()) return
    let input = text.trim()

    // Si el QR contiene una URL (ej. https://dominio.com/admin?scan=INGE-CLIENT:...), extraer el payload
    if (input.includes('?scan=')) {
      input = decodeURIComponent(input.split('?scan=')[1].split('&')[0])
    } else if (input.includes('?cliente=')) {
      input = decodeURIComponent(input.split('?cliente=')[1].split('&')[0])
    }

    setLoading(true)
    setVerificationResult(null)
    setDetectedClient(null)

    // 1. ¿Es una Tarjeta de Cliente (Dual Card)?
    if (input.startsWith('INGE-CLIENT:') || input.startsWith('user-') || (input.length === 10 && /^\d+$/.test(input))) {
      try {
        const res = await getClientByQueryApi(input)
        if (res.user) {
          setDetectedClient(res.user)
          setLoading(false)
          return
        }
      } catch {
        // Fallback local: buscar en allUsers
        const cleanDigits = input.replace(/\D/g, '')
        const found = allUsers.find(u => 
          u.id === input || 
          input.includes(u.id) || 
          (cleanDigits.length === 10 && u.phone && u.phone.includes(cleanDigits))
        )

        if (found) {
          setDetectedClient(found)
          setLoading(false)
          return
        }
      }
    }

    // 2. Si no es tarjeta de cliente, tratar como Cupón de descuento
    try {
      const res = await verifyCouponApi(input)
      if (res && res.valid) {
        setVerificationResult({
          valid: res.valid,
          message: res.message,
          status: res.valid ? 'active' : 'invalid',
          coupon: res.coupon
        })
        toast.success('¡Cupón VÁLIDO!', 'Listo para canjear 🎁')
      } else {
        // Intentar buscar como cliente por si era un ID
        const foundClient = allUsers.find(u => u.id === input || u.phone === input)
        if (foundClient) {
          setDetectedClient(foundClient)
          toast.info('Cliente detectado', foundClient.full_name)
        } else {
          const msg = res?.message || 'Cupón no válido.'
          setVerificationResult({
            valid: false,
            message: msg,
            status: 'invalid',
            coupon: res?.coupon
          })
          toast.error('Cupón no válido', msg)
        }
      }
    } catch (err: any) {
      // Si falla como cupón, verificar si es un cliente
      const foundClient = allUsers.find(u => u.id === input || u.phone === input)
      if (foundClient) {
        setDetectedClient(foundClient)
        toast.info('Cliente detectado', foundClient.full_name)
      } else {
        const msg = err.message || 'Código no reconocido. No coincide con un cupón ni con un cliente.'
        toast.error('Código no reconocido', msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Canjear Cupón
  const handleRedeem = async () => {
    if (!verificationResult?.coupon) return
    setRedeeming(true)

    try {
      const res = await redeemCouponApi(verificationResult.coupon.id, adminId)
      toast.success('¡Premio canjeado con éxito!', res.message || 'El cupón ha sido aplicado.')
      setVerificationResult(prev => prev ? { ...prev, status: 'redeemed', valid: false } : null)
      onRedeemedSuccess()
    } catch (err: any) {
      const msg = err.message || 'Error al canjear el cupón.'
      toast.error('Error en el canje', msg)
    } finally {
      setRedeeming(false)
    }
  }

  // Registrar Compra de Cupcakes al Cliente Detectado
  const handleRegisterClientPurchase = async () => {
    if (!detectedClient || cupcakesQty <= 0) return
    setRegisteringPurchase(true)

    const pricePerCupcake = 20.00
    const totalAmount = cupcakesQty * pricePerCupcake
    const spinsToGrant = Math.floor(cupcakesQty / 2)

    try {
      const res = await registerPurchaseApi({
        user_id: detectedClient.id,
        client_name: detectedClient.full_name,
        cupcakes_qty: cupcakesQty,
        unit_price: pricePerCupcake,
        total_amount: totalAmount,
        spins_granted: spinsToGrant,
        admin_id: adminId
      })
      const spins = res.spins_granted !== undefined ? res.spins_granted : spinsToGrant
      
      const updatedUser: UserProfile = {
        ...detectedClient,
        spins_available: (detectedClient.spins_available || 0) + spins,
        total_cupcakes_purchased: (detectedClient.total_cupcakes_purchased || 0) + cupcakesQty,
        updated_at: new Date().toISOString()
      }

      setDetectedClient(updatedUser)
      const successText = `¡Compra de ${cupcakesQty} cupcake${cupcakesQty === 1 ? '' : 's'} ($${totalAmount} MXN) registrada! Se acreditaron +${spins} jugada${spins === 1 ? '' : 's'} a ${detectedClient.full_name}.`
      toast.success('¡Compra registrada con éxito!', successText)
      
      if (onPurchaseSuccess) {
        onPurchaseSuccess(updatedUser, spins)
      }
      onRedeemedSuccess()
    } catch (err: any) {
      // Fallback local
      const updatedUser: UserProfile = {
        ...detectedClient,
        spins_available: (detectedClient.spins_available || 0) + spinsToGrant,
        total_cupcakes_purchased: (detectedClient.total_cupcakes_purchased || 0) + cupcakesQty,
        updated_at: new Date().toISOString()
      }
      setDetectedClient(updatedUser)
      toast.success('¡Compra registrada!', `+${spinsToGrant} tiros acreditados a ${detectedClient.full_name}.`)
      if (onPurchaseSuccess) {
        onPurchaseSuccess(updatedUser, spinsToGrant)
      }
      onRedeemedSuccess()
    } finally {
      setRegisteringPurchase(false)
    }
  }

  // Búsqueda Manual de Cliente
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    handleProcessDecoded(manualCode.trim())
  }

  // Cálculo de jugadas a otorgar
  const spinsCalculated = Math.floor(cupcakesQty / 2)
  const currentWeekly = detectedClient ? (detectedClient.total_cupcakes_purchased % 5 || (detectedClient.total_cupcakes_purchased > 0 ? 5 : 0)) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative border-4 border-orange-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition p-1"
        >
          <X size={20} />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 text-gray-900 pt-1">
          <div className="p-2.5 bg-orange-100 text-[#F56B2A] rounded-2xl">
            <QrCode size={24} />
          </div>
          <div>
            <h3 className="font-heading font-black text-lg leading-tight">Escáner El Inge 🥕</h3>
            <p className="text-xs text-gray-500">Escanea la Tarjeta Dual del cliente o sus cupones</p>
          </div>
        </div>

        {/* Tabs de Modo (Cámara vs Manual) */}
        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setScanMode('scan')}
            className={`flex-1 py-1.5 rounded-lg transition ${scanMode === 'scan' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
          >
            📷 Cámara QR
          </button>
          <button
            onClick={() => setScanMode('manual')}
            className={`flex-1 py-1.5 rounded-lg transition ${scanMode === 'manual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
          >
            ⌨️ Ingreso Manual
          </button>
        </div>

        {/* 1. Visor de Cámara QR */}
        {scanMode === 'scan' && (
          <div className="bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 min-h-[200px] flex items-center justify-center">
            <div id="reader" className="w-full" />
          </div>
        )}

        {/* 2. Entrada Manual */}
        <form onSubmit={handleManualSearch} className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
            Buscar por Teléfono, ID o Código de Cupón:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: 9611234567 o INGE-8F3A-9B2C"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono font-bold text-xs focus:outline-none focus:border-[#FF6D00]"
            />
            <button
              type="submit"
              disabled={loading || !manualCode.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#1E1E24] text-white font-bold text-xs flex items-center gap-1.5 hover:bg-[#FF6D00] transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
              Buscar
            </button>
          </div>
        </form>

        {/* ================================================================= */}
        {/* CASO A: CLIENTE DETECTADO (TARJETA DUAL DEL CLIENTE ESCANEADA)    */}
        {/* ================================================================= */}
        {detectedClient && (
          <div className="p-4 rounded-2xl bg-orange-50/80 border-2 border-orange-400 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-orange-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs">
                  <User size={16} />
                </div>
                <div>
                  <h4 className="font-heading font-black text-sm text-gray-900">{detectedClient.full_name}</h4>
                  <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                    <Phone size={10} /> {detectedClient.phone}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-orange-200 text-orange-900 rounded-md">
                IngID: {detectedClient.phone ? `INGE-${detectedClient.phone.slice(-4)}` : `DYLH${detectedClient.id.slice(-2).toUpperCase()}`}
              </span>
            </div>

            {/* Resumen de saldo del cliente */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-xl border border-orange-200">
                <span className="text-[10px] text-gray-500 block">Progreso semanal</span>
                <strong className="text-gray-900 text-sm font-bold">{currentWeekly}/5 cupcakes</strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-orange-200">
                <span className="text-[10px] text-gray-500 block">Tiros disponibles</span>
                <strong className="text-[#FF6D00] text-sm font-bold">{detectedClient.spins_available || 0} tiros 🎮</strong>
              </div>
            </div>

            {/* Panel de Registro de Compra */}
            <div className="bg-white p-3 rounded-xl border border-orange-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <ShoppingBag size={14} className="text-[#FF6D00]" /> Cupcakes a comprar:
                </span>
                <span className="text-xs font-extrabold text-green-700">
                  ${cupcakesQty * 20} MXN
                </span>
              </div>

              {/* Botones rápidos */}
              <div className="flex gap-1.5">
                {[1, 2, 4, 6, 12].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCupcakesQty(num)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold border transition ${
                      cupcakesQty === num 
                        ? 'bg-[#1E1E24] text-white border-[#1E1E24]' 
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    {num === 12 ? '12 (Docena)' : `${num}`}
                  </button>
                ))}
              </div>

              {/* Selector con + y - */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 border border-orange-200 bg-white px-2 py-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCupcakesQty(Math.max(1, cupcakesQty - 1))}
                    className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-heading font-black text-sm px-2">{cupcakesQty} pcs</span>
                  <button
                    type="button"
                    onClick={() => setCupcakesQty(cupcakesQty + 1)}
                    className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="text-xs text-gray-600 flex-1">
                  <p className="font-bold text-gray-900">${cupcakesQty * 20} MXN</p>
                  <p className="text-[10px] text-green-700 font-semibold">
                    +{spinsCalculated} {spinsCalculated === 1 ? 'tiro en ruleta' : 'tiros en ruleta'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleRegisterClientPurchase}
                disabled={registeringPurchase}
                className="w-full py-3 rounded-xl bg-[#F56B2A] text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition flex items-center justify-center gap-2"
              >
                {registeringPurchase ? <RefreshCw className="animate-spin" size={16} /> : <ShoppingBag size={16} />}
                Confirmar Compra en Caja
              </button>
            </div>
          </div>
        )}

        {/* ── SECCIÓN 2: RESULTADO DE CUPÓN DETECTADO ── */}
        {verificationResult && (
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
            <div className="flex items-start gap-3">
              {verificationResult.valid ? (
                <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
              ) : (
                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
              )}
              <div>
                <h4 className="font-heading font-bold text-sm">{verificationResult.message}</h4>
                {verificationResult.coupon && (
                  <div className="mt-1 text-xs space-y-0.5 text-gray-700">
                    <p><strong>Premio:</strong> {verificationResult.coupon.prize?.title}</p>
                    <p><strong>Código:</strong> {verificationResult.coupon.code}</p>
                    {(verificationResult.coupon as any).user_profile && (
                      <p><strong>Cliente:</strong> {(verificationResult.coupon as any).user_profile.full_name} ({(verificationResult.coupon as any).user_profile.phone || 'Sin teléfono'})</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Botón Aplicar Canje */}
            {verificationResult.valid && verificationResult.coupon && (
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="w-full py-3 rounded-xl bg-green-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                {redeeming ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Confirmar y Aplicar Canje
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
