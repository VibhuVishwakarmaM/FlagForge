import {
  BarChart3,
  FlaskConical,
  Flag,
  Layers,
  LayoutDashboard,
  ScrollText,
  Settings,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/flags', label: 'Feature Flags', icon: Flag },
      { href: '/experiments', label: 'Experiments', icon: FlaskConical },
      { href: '/environments', label: 'Environments', icon: Layers },
      { href: '/rules', label: 'Targeting Rules', icon: Target },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/audit', label: 'Audit Logs', icon: ScrollText },
    ],
  },
  {
    label: 'Organization',
    items: [
      { href: '/team', label: 'Team & Access', icon: Users },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export const isActivePath = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
