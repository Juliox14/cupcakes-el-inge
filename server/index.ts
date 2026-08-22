import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { gamesRouter } from './routes/games.js'
import { couponsRouter } from './routes/coupons.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'
import { productsRouter } from './routes/products.js'

const app = new Hono()

// Orígenes permitidos para CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://localhost:8787'
    ]

// Middleware de CORS para permitir solicitudes legítimas
app.use('/api/*', cors({
  origin: (origin) => {
    // Si no hay origin (petición interna o móvil nativo) o está en desarrollo, permitir
    if (!origin || process.env.NODE_ENV !== 'production') {
      return origin || '*'
    }
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Endpoint de verificación de estado
app.get('/api/saludo', (c) => {
  return c.json({ 
    ok: true, 
    mensaje: '¡Hola desde la API Hono de Cupcakes de zanahoria El Inge! 🥕',
    timestamp: new Date().toISOString()
  })
})

// Montar módulos de rutas API
app.route('/api/auth', authRouter)
app.route('/api/games', gamesRouter)
app.route('/api/coupons', couponsRouter)
app.route('/api/admin', adminRouter)
app.route('/api/products', productsRouter)

export default app
