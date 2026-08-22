import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Función para garantizar la lectura de .env en el servidor de desarrollo de Vite / Node
function getEnvConfig() {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8')
      content.split('\n').forEach(line => {
        const clean = line.trim()
        if (clean && !clean.startsWith('#') && clean.includes('=')) {
          const idx = clean.indexOf('=')
          const key = clean.slice(0, idx).trim()
          const val = clean.slice(idx + 1).trim()
          if (!env[key]) env[key] = val
        }
      })
    }
  } catch (err) {
    console.error('Error cargando .env en servidor:', err)
  }
  return env
}

const env = getEnvConfig()

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://fjsewqxchtfamigokwlt.supabase.co'
const supabaseServiceKey = 
  env.SUPABASE_SECRET_KEY || 
  env.SUPABASE_SERVICE_ROLE_KEY || 
  env.SUPABASE_PUBLISHABLE_KEY || 
  env.VITE_SUPABASE_ANON_KEY || 
  ''

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
