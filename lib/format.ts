import type { EnvironmentKey, RuleOperator } from '@/lib/types'

export const environmentKeys: EnvironmentKey[] = ['development', 'staging', 'production']

export const environmentLabels: Record<EnvironmentKey, string> = {
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
}

export const environmentDotClass: Record<EnvironmentKey, string> = {
  development: 'bg-chart-3',
  staging: 'bg-warning',
  production: 'bg-chart-5',
}

export const operatorLabels: Record<RuleOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  in: 'is one of',
  greater_than: 'is greater than',
  less_than: 'is less than',
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const full = new Intl.NumberFormat('en-US')

export const formatCompact = (n: number) => compact.format(n)
export const formatNumber = (n: number) => full.format(n)
export const formatPercent = (n: number, digits = 1) => `${n.toFixed(digits)}%`

export function formatRelative(iso: string | null) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatShortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
