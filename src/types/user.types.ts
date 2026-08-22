export interface UserProfile {
  id: string
  full_name: string
  email?: string
  phone?: string
  role: 'client' | 'admin'
  spins_available: number
  total_cupcakes_purchased: number
  created_at?: string
  updated_at?: string
}
