import React, { useState } from 'react'
import {
  ShoppingBag,
  Sparkles,
  Clock,
  Calendar,
  MessageCircle,
  Plus,
  Minus,
  X,
  Info,
  ChevronRight,
  Cake,
  Code
} from 'lucide-react'
import type { UserProfile } from '../../types'

interface ClientProductsCatalogProps {
  currentUser?: UserProfile
  onOpenGames?: () => void
}

interface OrderItem {
  type: 'cake' | 'half_dozen' | 'dozen' | 'two_dozens' | 'custom'
  title: string
  subtitle: string
  description: string
  price: number
  cupcakesCount?: number
  spinsGranted: number
  imageUrl: string
  imageCount?: number
  badge?: string
  badgeColor?: string
}

export const ClientProductsCatalog: React.FC<ClientProductsCatalogProps> = ({
  currentUser,
  onOpenGames,
}) => {
  // Cantidad personalizada de cupcakes (hasta abajo)
  const [customQty, setCustomQty] = useState<number>(4)

  // Estado del Modal de Encargo
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null)
  const [customerName, setCustomerName] = useState(
    currentUser?.full_name || (currentUser as any)?.nombre_completo || ''
  )
  const [customerPhone, setCustomerPhone] = useState(
    currentUser?.phone || (currentUser as any)?.telefono || ''
  )
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [deliveryTime, setDeliveryTime] = useState('12:30')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  React.useEffect(() => {
    const name = currentUser?.full_name || (currentUser as any)?.nombre_completo
    const phone = currentUser?.phone || (currentUser as any)?.telefono
    if (name && !customerName) setCustomerName(name)
    if (phone && !customerPhone) setCustomerPhone(phone)
  }, [currentUser])

  // Paquetes predefinidos con imágenes transparentes sin fondo
  const predefinedProducts: OrderItem[] = [
    {
      type: 'cake',
      title: 'Pastel de Zanahoria Tradicional',
      subtitle: 'Pastel Completo Artesanal (10-12 rebanadas)',
      description: 'Nuestra receta insignia en tamaño grande: horneado con nuez, canela y especias finas, relleno y cubierto por generoso frosting de queso crema.',
      price: 400,
      spinsGranted: 10,
      imageUrl: '/pastel-transparente.webp',
      badge: 'Pastel Completo 🎂',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300'
    },
    {
      type: 'dozen',
      title: 'Caja Docena Completa',
      subtitle: '12 Cupcakes de Zanahoria',
      description: 'La opción favorita para compartir con amigos de facultad, equipo de trabajo o reuniones familiares. Frescos del día.',
      price: 240,
      cupcakesCount: 12,
      spinsGranted: 6,
      imageUrl: '/cupcake-transparente.webp',
      imageCount: 3,
      badge: '⭐ Más Popular (12 piezas)',
      badgeColor: 'bg-orange-100 text-[#F56B2A] border-orange-200'
    },
    {
      type: 'half_dozen',
      title: 'Caja Media Docena',
      subtitle: '6 Cupcakes de Zanahoria',
      description: '6 cupcakes artesanales recién horneados con betún de queso crema y un toque de canela. La porción perfecta para regalar o consentirte.',
      price: 120,
      cupcakesCount: 6,
      spinsGranted: 3,
      imageUrl: '/cupcake-transparente.webp',
      imageCount: 2,
      badge: 'Caja de 6 piezas',
      badgeColor: 'bg-orange-50 text-orange-800 border-orange-200'
    },
    {
      type: 'two_dozens',
      title: 'Paquete Doble Docena',
      subtitle: '24 Cupcakes (Lote Diario Completo)',
      description: 'Toda la producción artesanal del día (24 piezas) lista para tus festejos, celebraciones de cumpleaños o eventos especiales.',
      price: 480,
      cupcakesCount: 24,
      spinsGranted: 12,
      imageUrl: '/cupcake-transparente.webp',
      imageCount: 4,
      badge: 'Lote Completo (24 piezas) 👑',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300'
    }
  ]

  const handleOpenOrderModal = (item: OrderItem) => {
    setSelectedItem(item)
  }

  const handleOpenCustomOrderModal = () => {
    const item: OrderItem = {
      type: 'custom',
      title: 'Pedido Personalizado (' + customQty + ' cupcakes)',
      subtitle: customQty + ' cupcakes de zanahoria a tu medida',
      description: 'Pedido preparado especialmente con la cantidad exacta que necesitas para hoy o tu evento.',
      price: customQty * 20,
      cupcakesCount: customQty,
      spinsGranted: Math.floor(customQty / 2),
      imageUrl: '/cupcake-transparente.webp',
      imageCount: 1,
      badge: customQty + ' piezas a tu gusto 🧁',
      badgeColor: 'bg-orange-100 text-[#F56B2A] border-orange-200'
    }
    setSelectedItem(item)
  }

  const handleSendWhatsAppOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return

    const phoneAdmin = '13069421565'
    const notesLine = deliveryNotes ? ('\n📝 *Notas/Indicaciones:* ' + deliveryNotes) : ''
    const textMsg = '¡Hola Inge! 🧁 Me gustaría hacer un encargo desde la app:\n\n' +
      '📦 *Pedido:* ' + selectedItem.title + '\n' +
      '💰 *Total:* $' + selectedItem.price + ' MXN\n' +
      '🎁 *Tiros de ruleta incluidos:* ' + selectedItem.spinsGranted + ' tiros\n\n' +
      '👤 *Cliente:* ' + (customerName || 'Cliente') + '\n' +
      '📱 *Teléfono:* ' + (customerPhone || 'Sin teléfono') + '\n' +
      '📅 *Fecha de entrega/recolección:* ' + deliveryDate + '\n' +
      '⏰ *Hora deseada:* ' + deliveryTime + ' hrs' + notesLine + '\n\n' +
      '¿Me podrías confirmar la disponibilidad? ¡Gracias! ✨'

    const encodedMsg = encodeURIComponent(textMsg)
    const whatsappUrl = 'https://wa.me/' + phoneAdmin + '?text=' + encodedMsg
    window.open(whatsappUrl, '_blank')
  }

  // Renderizador de imágenes transparentes (individual o composición de empaque)
  const renderProductImage = (prod: OrderItem) => {
    if (prod.type === 'cake') {
      return (
        <div className="relative w-full h-36 flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full bg-gradient-to-b from-amber-100/70 to-orange-50/30 blur-md pointer-events-none" />
          <img
            src={prod.imageUrl}
            alt={prod.title}
            width={128}
            height={128}
            decoding="async"
            className="relative z-10 h-32 w-auto object-contain drop-shadow-md group-hover:scale-108 group-hover:-translate-y-1 transition-all duration-300"
            loading="lazy"
          />
        </div>
      )
    }

    const count = prod.imageCount || 1

    return (
      <div className="relative w-full h-36 flex items-center justify-center">
        <div className="absolute w-28 h-28 rounded-full bg-gradient-to-b from-orange-100/70 to-amber-50/30 blur-md pointer-events-none" />
        {count === 1 && (
          <img
            src={prod.imageUrl}
            alt={prod.title}
            width={112}
            height={112}
            decoding="async"
            className="relative z-10 h-28 w-auto object-contain drop-shadow-md group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300"
            loading="lazy"
          />
        )}
        {count === 2 && (
          <div className="relative z-10 flex items-center justify-center -space-x-6 group-hover:-translate-y-1 transition-all duration-300">
            <img
              src={prod.imageUrl}
              alt={prod.title}
              width={96}
              height={96}
              decoding="async"
              className="h-24 w-auto object-contain drop-shadow-md -rotate-6 transform group-hover:-rotate-12 transition-transform duration-300"
              loading="lazy"
            />
            <img
              src={prod.imageUrl}
              alt={prod.title}
              width={112}
              height={112}
              decoding="async"
              className="h-28 w-auto object-contain drop-shadow-lg rotate-6 transform group-hover:rotate-12 group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        )}
        {count === 3 && (
          <div className="relative z-10 flex items-center justify-center -space-x-8 group-hover:-translate-y-1 transition-all duration-300">
            <img
              src={prod.imageUrl}
              alt={prod.title}
              width={88}
              height={88}
              decoding="async"
              className="h-22 w-auto object-contain drop-shadow-md -rotate-12 transform group-hover:-rotate-16 transition-transform duration-300 opacity-90"
              loading="lazy"
            />
            <img
              src={prod.imageUrl}
              alt={prod.title}
              width={112}
              height={112}
              decoding="async"
              className="h-28 w-auto object-contain drop-shadow-xl z-20 transform group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <img
              src={prod.imageUrl}
              alt={prod.title}
              width={88}
              height={88}
              decoding="async"
              className="h-22 w-auto object-contain drop-shadow-md rotate-12 transform group-hover:rotate-16 transition-transform duration-300 opacity-90"
              loading="lazy"
            />
          </div>
        )}
        {count >= 4 && (
          <div className="relative z-10 flex flex-col items-center justify-center group-hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center -space-x-6">
              <img
                src={prod.imageUrl}
                alt={prod.title}
                width={80}
                height={80}
                decoding="async"
                className="h-20 w-auto object-contain drop-shadow-md -rotate-8 transform"
                loading="lazy"
              />
              <img
                src={prod.imageUrl}
                alt={prod.title}
                width={80}
                height={80}
                decoding="async"
                className="h-20 w-auto object-contain drop-shadow-md rotate-8 transform"
                loading="lazy"
              />
            </div>
            <div className="flex items-center -space-x-6 -mt-6 z-20">
              <img
                src={prod.imageUrl}
                alt={prod.title}
                width={88}
                height={88}
                decoding="async"
                className="h-22 w-auto object-contain drop-shadow-xl"
                loading="lazy"
              />
              <img
                src={prod.imageUrl}
                alt={prod.title}
                width={88}
                height={88}
                decoding="async"
                className="h-22 w-auto object-contain drop-shadow-xl scale-105"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-24 space-y-6">
      {/* 1. HERO BANNER DE ENCARGOS (NARANJA CÁLIDO) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E65100] via-[#F56B2A] to-[#FB8C00] text-white p-5 shadow-sm space-y-2">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-black tracking-wide uppercase">
            <Code size={12} />
            <span>El Inge</span>
          </div>
          <h1 className="text-xl font-black font-heading leading-tight">
            Encarga tus Cupcakes & Pasteles
          </h1>
          <p className="text-xs text-white/90 leading-relaxed">
            Elaborados cada día con zanahoria fresca, especias finas, nuez y betún de queso crema. ¡Por cada 2 cupcakes ganas 1 tiro en la ruleta!
          </p>
          {onOpenGames && (
            <div className="pt-1">
              <button
                onClick={onOpenGames}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <span>Ver Ruleta de Premios</span>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* 2. CATÁLOGO DE PRODUCTOS & PAQUETES (TARJETAS SIN FONDO CORTADO) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 tracking-tight">
            Nuestros Productos & Paquetes
          </h2>
          <span className="text-xs text-gray-500 font-medium">4 opciones</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {predefinedProducts.map((prod) => (
            <div
              key={prod.type}
              className="bg-white rounded-2xl border border-orange-100/90 p-4 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-3 relative overflow-hidden group"
            >
              {/* Badge Superior y Recompensa */}
              <div className="flex items-center justify-between gap-2">
                {prod.badge ? (
                  <span className={'text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ' + prod.badgeColor}>
                    {prod.badge}
                  </span>
                ) : <span />}
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  +{prod.spinsGranted} {prod.spinsGranted === 1 ? 'tiro' : 'tiros'} ruleta
                </span>
              </div>

              {/* Imagen Flotante Sin Fondo con Efecto Pedestal */}
              {renderProductImage(prod)}

              {/* Información del Producto */}
              <div className="space-y-1 text-center">
                <h3 className="text-base font-bold text-gray-900 leading-snug">
                  {prod.title}
                </h3>
                <p className="text-[11px] font-semibold text-[#F56B2A]">
                  {prod.subtitle}
                </p>
                <p className="text-xs text-gray-600 leading-relaxed pt-0.5">
                  {prod.description}
                </p>
              </div>

              {/* Fila Inferior: Precio + Botón Naranja */}
              <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xl font-black text-[#F56B2A]">
                    ${prod.price} <span className="text-xs font-semibold text-gray-500">MXN</span>
                  </span>
                  {prod.cupcakesCount && (
                    <span className="block text-[10px] text-gray-400 font-medium">
                      (${Math.round(prod.price / prod.cupcakesCount)}/pieza)
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleOpenOrderModal(prod)}
                  className="px-4 py-2 rounded-xl bg-[#F56B2A] hover:bg-[#E05A1D] active:scale-95 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag size={14} />
                  <span>Encargar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. SELECTOR DE CANTIDAD PERSONALIZADA (HASTA ABAJO, 1 a 24 cupcakes) */}
      <div className="bg-white rounded-2xl p-4 border border-orange-200 shadow-2xs space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100 text-[#F56B2A] border border-orange-200">
                A tu Medida
              </span>
              <span className="text-[10px] font-bold text-gray-500">Tope: 24 cupcakes</span>
            </div>
            <h3 className="font-bold text-sm text-gray-900 mt-1">
              Encargar Cantidad Personalizada
            </h3>
            <p className="text-xs text-gray-500">
              Elige exactamente cuántos cupcakes deseas llevar hoy ($20 MXN c/u).
            </p>
          </div>
        </div>

        {/* Mini Preview de Cupcake sin fondo */}
        <div className="relative py-1 flex items-center justify-center">
          <div className="absolute w-32 h-32 rounded-full bg-orange-100/60 blur-sm pointer-events-none" />
          <img
            src="/cupcake-transparente.webp"
            alt="Cupcake Personalizado"
            className="relative z-10 h-20 object-contain drop-shadow-md"
          />
        </div>

        {/* Controles de Cantidad (+ / -) */}
        <div className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCustomQty(prev => Math.max(1, prev - 1))}
              disabled={customQty <= 1}
              className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-gray-800 font-black flex items-center justify-center shadow-2xs hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Disminuir"
            >
              <Minus size={16} />
            </button>
            <div className="text-center min-w-[60px]">
              <span className="text-2xl font-black text-[#F56B2A]">
                {customQty}
              </span>
              <span className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                {customQty === 1 ? 'cupcake' : 'cupcakes'}
              </span>
            </div>
            <button
              onClick={() => setCustomQty(prev => Math.min(24, prev + 1))}
              disabled={customQty >= 24}
              className="w-9 h-9 rounded-lg bg-white border border-gray-300 text-gray-800 font-black flex items-center justify-center shadow-2xs hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Aumentar"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-gray-900">
              ${customQty * 20} <span className="text-xs font-semibold text-gray-500">MXN</span>
            </p>
            <p className="text-[10px] font-bold text-emerald-700 flex items-center justify-end gap-1">
              <Sparkles size={11} />
              <span>+{Math.floor(customQty / 2)} tiros de ruleta</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCustomOrderModal}
          className="w-full py-2.5 px-4 rounded-xl bg-[#F56B2A] hover:bg-[#E05A1D] active:scale-95 text-white font-bold text-xs shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ShoppingBag size={15} />
          <span>Encargar {customQty} {customQty === 1 ? 'Cupcake' : 'Cupcakes'} (${customQty * 20} MXN)</span>
        </button>
      </div>

      {/* 4. BANNER PARA PEDIDOS MAYORES (> 24 CUPCAKES / BANQUETES) */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500 to-[#F56B2A] text-white shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
            <Cake size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">
              ¿Necesitas más de 24 cupcakes o para un evento?
            </h3>
            <p className="text-[11px] text-white/90">
              Banquetes, fiestas de cumpleaños y pedidos especiales.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-white/90 leading-relaxed">
          Para pedidos grandes de más de 24 piezas, por favor cotiza con anticipación directamente por WhatsApp.
        </p>
        <a
          href="https://wa.me/13069421565?text=%C2%A1Hola%20Inge!%20%F0%9F%A7%81%20Me%20gustar%C3%ADa%20cotizar%20un%20pedido%20especial%20de%20m%C3%A1s%20de%2024%20cupcakes%20o%20para%20un%20evento.%20%C2%BFMe%20podr%C3%ADas%20dar%20informes%3F"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 px-4 rounded-xl bg-white text-gray-900 hover:bg-gray-50 active:scale-95 font-bold text-xs shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <MessageCircle size={15} className="text-emerald-600" />
          <span>Cotizar Pedido Grande por WhatsApp</span>
        </a>
      </div>

      {/* 5. MODAL DE CONFIRMACIÓN DE ENCARGO */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-xl p-5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-100 text-[#F56B2A] flex items-center justify-center font-bold">
                  <ShoppingBag size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">
                    Confirmar Encargo
                  </h3>
                  <p className="text-[10px] text-gray-500">Envío directo a WhatsApp del Inge</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            {/* Mini preview en modal con imagen transparente */}
            <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-white border border-orange-200 flex items-center justify-center shrink-0 p-1">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="max-h-full max-w-full object-contain drop-shadow-xs"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs text-gray-900 truncate">
                  {selectedItem.title}
                </h4>
                <p className="text-[10px] text-gray-600 truncate">
                  {selectedItem.subtitle}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-black text-[#F56B2A]">
                    ${selectedItem.price} MXN
                  </span>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                    +{selectedItem.spinsGranted} tiros ruleta
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendWhatsAppOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#F56B2A] focus:ring-1 focus:ring-[#F56B2A] transition outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ej. 961 123 4567"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#F56B2A] focus:ring-1 focus:ring-[#F56B2A] transition outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar size={12} className="text-gray-400" />
                    <span>Fecha deseada *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#F56B2A] focus:ring-1 focus:ring-[#F56B2A] transition outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Clock size={12} className="text-gray-400" />
                    <span>Hora deseada *</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#F56B2A] focus:ring-1 focus:ring-[#F56B2A] transition outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Notas adicionales (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Ej. Entregar en biblioteca, dedicatoria especial..."
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#F56B2A] focus:ring-1 focus:ring-[#F56B2A] transition outline-hidden resize-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 text-[11px] flex items-start gap-1.5">
                <Info size={14} className="text-[#F56B2A] shrink-0 mt-0.5" />
                <p>
                  Al presionar el botón se abrirá WhatsApp con los datos de tu encargo listos para ser confirmados por El Inge.
                </p>
              </div>

              <div className="pt-1 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#1EBE5B] active:scale-95 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}