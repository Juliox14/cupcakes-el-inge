import type { PlayGameResult, Prize } from '../../../types'

export interface RouletteProps {
  spinsAvailable: number
  prizes?: Prize[]
  onPlay: (gameType: 'roulette') => Promise<PlayGameResult>
}

export interface RouletteSlice {
  id?: string
  text: string
  emoji: string
  type: 'gift' | 'promo' | 'disc' | 'none'
  color: string
  tcolor: string
  weight: number
}

export interface RouletteResultState {
  slice: RouletteSlice
  apiResult: PlayGameResult | null
  isWon: boolean
}
