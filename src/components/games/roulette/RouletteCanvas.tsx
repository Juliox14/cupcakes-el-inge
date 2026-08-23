import type { RouletteSlice } from './Roulette.types'

export const ROULETTE_SZ = 360
const CX = ROULETTE_SZ / 2
const CY = ROULETTE_SZ / 2
const R = 166
const PIN_R = R + 4
const PIN_SIZE = 6.5

function wrapText(ctx: CanvasRenderingContext2D, str: string, maxW: number): string[] {
  const words = str.split(' ')
  const lines: string[] = []
  let line = ''
  ctx.font = 'bold 10px sans-serif'
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export function drawWheel(
  ctx: CanvasRenderingContext2D, 
  angle: number, 
  cupcake: HTMLImageElement | null,
  slices: RouletteSlice[]
) {
  ctx.clearRect(0, 0, ROULETTE_SZ, ROULETTE_SZ)
  const n = slices.length
  const arc = (2 * Math.PI) / n

  // 1. Aro exterior elegante café con bisel
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, R + 12, 0, 2 * Math.PI)
  ctx.fillStyle = '#4A2300'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = '#2B1200'
  ctx.stroke()
  ctx.restore()

  // 2. Segmentos de la Ruleta
  for (let i = 0; i < n; i++) {
    const s  = slices[i]
    const sa = angle + i * arc
    const ea = sa + arc

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(CX, CY)
    ctx.arc(CX, CY, R, sa, ea)
    ctx.closePath()
    ctx.fillStyle = s.color
    ctx.fill()
    ctx.strokeStyle = '#5A2E00'
    ctx.lineWidth = 2.2
    ctx.stroke()
    ctx.restore()

    // Texto y emoji radial
    const mid = sa + arc / 2
    ctx.save()
    ctx.translate(CX, CY)
    ctx.rotate(mid)

    // Emoji centralizado en el radio
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(s.emoji, 32, 0)

    // Texto multilínea legible
    const textR = R * 0.69
    const lines = wrapText(ctx, s.text, 82)
    const lh    = 12.5
    const tot   = lines.length * lh
    ctx.font = 'bold 9.5px "Plus Jakarta Sans", sans-serif'
    ctx.fillStyle = s.tcolor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    lines.forEach((l, li) => {
      ctx.fillText(l, textR, -tot / 2 + li * lh + lh / 2)
    })

    ctx.restore()
  }

  // 3. Topes metálicos (Pins) con relieve y brillo
  for (let i = 0; i < n; i++) {
    const pinAngle = angle + i * arc
    const px = CX + PIN_R * Math.cos(pinAngle)
    const py = CY + PIN_R * Math.sin(pinAngle)

    // Sombra del pin
    ctx.save()
    ctx.beginPath()
    ctx.arc(px + 1.2, py + 1.2, PIN_SIZE, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fill()
    ctx.restore()

    // Cuerpo metálico
    ctx.save()
    ctx.beginPath()
    ctx.arc(px, py, PIN_SIZE, 0, 2 * Math.PI)
    ctx.fillStyle = '#EAE2D5'
    ctx.fill()
    ctx.strokeStyle = '#825C30'
    ctx.lineWidth = 1.4
    ctx.stroke()

    // Reflejo de luz
    ctx.beginPath()
    ctx.arc(px - 1.8, py - 1.8, PIN_SIZE * 0.4, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fill()
    ctx.restore()
  }

  // 4. Centro con Cupcake de Alta Definición
  ctx.save()
  const cR = 48
  ctx.beginPath()
  ctx.arc(CX, CY, cR, 0, 2 * Math.PI)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.strokeStyle = '#4A2300'
  ctx.lineWidth = 3.5
  ctx.stroke()

  // Sombra interior del círculo central
  ctx.shadowColor = 'rgba(0,0,0,0.12)'
  ctx.shadowBlur = 8

  if (cupcake && cupcake.complete && cupcake.naturalWidth) {
    const s = cR * 1.72
    ctx.drawImage(cupcake, CX - s / 2, CY - s / 2, s, s)
  } else {
    ctx.font = '38px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🧁', CX, CY + 2)
  }
  ctx.restore()
}
