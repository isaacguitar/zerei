import { Activity, Archive, Gamepad2, LayoutDashboard, Trophy, Users } from 'lucide-react'

export const currentUser = {
  id: '',
  displayName: '',
  level: 1,
  rank: '',
  avatarUrl: '',
}

export const navigationItems = [
  { label: 'Visão geral', icon: LayoutDashboard },
  { label: 'Sala de jogo', icon: Gamepad2 },
  { label: 'Minha estante', icon: Archive },
  { label: 'Clubes', icon: Users },
  { label: 'Ranking', icon: Trophy },
  { label: 'Feed da comunidade', icon: Activity },
]

export const currentRound = {
  id: '',
  clubName: '',
  title: '',
  status: '',
  endsIn: '',
  games: [],
}

export const activities = []
