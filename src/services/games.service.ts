import { API_BASE, handleApiResponse } from './api.client'
import type { PlayGameResult, Prize } from '../types'

export async function getPublicPrizesApi(): Promise<{ prizes: Prize[] }> {
  const res = await fetch(`${API_BASE}/games/prizes`)
  return handleApiResponse(res, 'Error al obtener las promociones de la ruleta.')
}

export async function playGameApi(
  userId: string,
  gameType: 'roulette' | 'scratch' | 'slots' = 'roulette'
): Promise<PlayGameResult> {
  const res = await fetch(`${API_BASE}/games/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, game_type: gameType }),
  })
  return handleApiResponse(res, 'Error al ejecutar la jugada.')
}
