import type {
  AnalyticsSnapshot,
  AuditEvent,
  Environment,
  EnvironmentKey,
  Experiment,
  FeatureFlag,
  FlagEnvironmentConfig,
  SdkKey,
  TargetingRule,
  TeamMember,
  Workspace,
} from '@/lib/types'

const envConfig = (
  enabled: boolean,
  rollout: number,
  served: string,
  fallback: string,
  ruleIds: string[] = [],
): FlagEnvironmentConfig => ({ enabled, rollout, ruleIds, servedVariantId: served, fallbackVariantId: fallback })

const booleanVariants = [
  { id: 'on', name: 'On', value: 'true' },
  { id: 'off', name: 'Off', value: 'false' },
]

const envs = (
  dev: FlagEnvironmentConfig,
  staging: FlagEnvironmentConfig,
  production: FlagEnvironmentConfig,
): Record<EnvironmentKey, FlagEnvironmentConfig> => ({ development: dev, staging, production })

export const seedEnvironments: Environment[] = [
  {
    key: 'development',
    name: 'Development',
    description: 'Local and preview builds. Changes apply instantly with no approval.',
    requireApproval: false,
    defaultRollout: 100,
    sdkKeyHint: 'dev_••••3f9a',
    createdAt: '2025-02-11T09:00:00Z',
  },
  {
    key: 'staging',
    name: 'Staging',
    description: 'Pre-production QA environment mirroring production configuration.',
    requireApproval: false,
    defaultRollout: 50,
    sdkKeyHint: 'stg_••••81c2',
    createdAt: '2025-02-11T09:00:00Z',
  },
  {
    key: 'production',
    name: 'Production',
    description: 'Live customer traffic. Changes are logged and require confirmation.',
    requireApproval: true,
    defaultRollout: 0,
    sdkKeyHint: 'prd_••••d04e',
    createdAt: '2025-02-11T09:00:00Z',
  },
]

export const seedRules: TargetingRule[] = [
  {
    id: 'rule_beta',
    name: 'Beta testers',
    description: 'Users enrolled in the public beta program.',
    combinator: 'OR',
    conditions: [
      { id: 'c1', attribute: 'email', operator: 'contains', value: '@flagforge.dev' },
      { id: 'c2', attribute: 'beta', operator: 'equals', value: 'true' },
    ],
    createdAt: '2026-08-02T10:12:00Z',
    updatedAt: '2026-11-18T14:20:00Z',
  },
  {
    id: 'rule_enterprise_eu',
    name: 'Enterprise in EU',
    description: 'Enterprise plan customers located in the European Union.',
    combinator: 'AND',
    conditions: [
      { id: 'c3', attribute: 'plan', operator: 'equals', value: 'enterprise' },
      { id: 'c4', attribute: 'country', operator: 'in', value: 'DE,FR,NL,ES,IT' },
    ],
    createdAt: '2026-09-14T08:40:00Z',
    updatedAt: '2026-11-02T11:05:00Z',
  },
  {
    id: 'rule_power_users',
    name: 'Power users',
    description: 'Accounts with high weekly session counts.',
    combinator: 'AND',
    conditions: [
      { id: 'c5', attribute: 'sessions_per_week', operator: 'greater_than', value: '20' },
      { id: 'c6', attribute: 'plan', operator: 'not_equals', value: 'free' },
    ],
    createdAt: '2026-10-01T16:00:00Z',
    updatedAt: '2026-10-21T09:30:00Z',
  },
]

export const seedFlags: FeatureFlag[] = [
  {
    id: 'flg_1',
    key: 'new-checkout-flow',
    name: 'New checkout flow',
    description: 'Single-page checkout with saved payment methods and address autocomplete.',
    type: 'boolean',
    tags: ['payments', 'growth'],
    owner: 'Priya Natarajan',
    variants: booleanVariants,
    environments: envs(
      envConfig(true, 100, 'on', 'off'),
      envConfig(true, 100, 'on', 'off', ['rule_beta']),
      envConfig(true, 35, 'on', 'off', ['rule_beta']),
    ),
    createdAt: '2026-09-03T12:00:00Z',
    updatedAt: '2026-11-24T16:42:00Z',
  },
  {
    id: 'flg_2',
    key: 'pricing-page-layout',
    name: 'Pricing page layout',
    description: 'Tests three pricing table layouts for plan selection conversion.',
    type: 'multivariate',
    tags: ['marketing', 'experiment'],
    owner: 'Marcus Chen',
    variants: [
      { id: 'grid', name: 'Grid', value: 'grid', description: 'Current three-column grid' },
      { id: 'stacked', name: 'Stacked', value: 'stacked', description: 'Vertical comparison list' },
      { id: 'slider', name: 'Usage slider', value: 'slider', description: 'Interactive usage-based estimate' },
    ],
    environments: envs(
      envConfig(true, 100, 'stacked', 'grid'),
      envConfig(true, 100, 'slider', 'grid'),
      envConfig(true, 60, 'stacked', 'grid'),
    ),
    createdAt: '2026-10-11T09:20:00Z',
    updatedAt: '2026-11-23T10:05:00Z',
  },
  {
    id: 'flg_3',
    key: 'ai-search-assistant',
    name: 'AI search assistant',
    description: 'Natural-language search assistant in the docs portal.',
    type: 'boolean',
    tags: ['ai', 'docs'],
    owner: 'Lena Fischer',
    variants: booleanVariants,
    environments: envs(
      envConfig(true, 100, 'on', 'off'),
      envConfig(true, 50, 'on', 'off', ['rule_power_users']),
      envConfig(false, 10, 'on', 'off', ['rule_power_users']),
    ),
    createdAt: '2026-10-29T15:10:00Z',
    updatedAt: '2026-11-22T18:30:00Z',
  },
  {
    id: 'flg_4',
    key: 'eu-data-residency',
    name: 'EU data residency',
    description: 'Routes storage writes for EU enterprise tenants to the Frankfurt region.',
    type: 'boolean',
    tags: ['compliance', 'infra'],
    owner: 'Jonas Weber',
    variants: booleanVariants,
    environments: envs(
      envConfig(true, 100, 'on', 'off', ['rule_enterprise_eu']),
      envConfig(true, 100, 'on', 'off', ['rule_enterprise_eu']),
      envConfig(true, 100, 'on', 'off', ['rule_enterprise_eu']),
    ),
    createdAt: '2026-06-18T07:45:00Z',
    updatedAt: '2026-11-15T13:12:00Z',
  },
  {
    id: 'flg_5',
    key: 'dashboard-density',
    name: 'Dashboard density',
    description: 'Controls default information density of the analytics dashboard.',
    type: 'multivariate',
    tags: ['ux'],
    owner: 'Sofia Romero',
    variants: [
      { id: 'comfortable', name: 'Comfortable', value: 'comfortable' },
      { id: 'compact', name: 'Compact', value: 'compact' },
    ],
    environments: envs(
      envConfig(true, 100, 'compact', 'comfortable'),
      envConfig(true, 100, 'compact', 'comfortable'),
      envConfig(false, 0, 'compact', 'comfortable'),
    ),
    createdAt: '2026-11-04T11:00:00Z',
    updatedAt: '2026-11-20T09:48:00Z',
  },
  {
    id: 'flg_6',
    key: 'realtime-notifications',
    name: 'Realtime notifications',
    description: 'WebSocket-powered in-app notifications instead of polling.',
    type: 'boolean',
    tags: ['infra', 'performance'],
    owner: 'Marcus Chen',
    variants: booleanVariants,
    environments: envs(
      envConfig(true, 100, 'on', 'off'),
      envConfig(true, 100, 'on', 'off'),
      envConfig(true, 80, 'on', 'off'),
    ),
    createdAt: '2026-07-22T10:30:00Z',
    updatedAt: '2026-11-19T08:15:00Z',
  },
  {
    id: 'flg_7',
    key: 'legacy-export-api',
    name: 'Legacy export API',
    description: 'Kill switch for the deprecated v1 CSV export endpoint.',
    type: 'boolean',
    tags: ['kill-switch', 'api'],
    owner: 'Jonas Weber',
    variants: booleanVariants,
    environments: envs(
      envConfig(false, 0, 'on', 'off'),
      envConfig(false, 0, 'on', 'off'),
      envConfig(true, 100, 'on', 'off'),
    ),
    createdAt: '2025-03-14T09:00:00Z',
    updatedAt: '2026-10-30T17:00:00Z',
  },
  {
    id: 'flg_8',
    key: 'onboarding-checklist',
    name: 'Onboarding checklist',
    description: 'Guided setup checklist for newly created workspaces.',
    type: 'boolean',
    tags: ['growth', 'experiment'],
    owner: 'Priya Natarajan',
    variants: booleanVariants,
    environments: envs(
      envConfig(true, 100, 'on', 'off'),
      envConfig(true, 100, 'on', 'off'),
      envConfig(true, 50, 'on', 'off'),
    ),
    createdAt: '2026-10-05T14:25:00Z',
    updatedAt: '2026-11-21T12:00:00Z',
  },
]

const days = (count: number) =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date('2026-11-25T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - (count - 1 - i))
    return d.toISOString().slice(0, 10)
  })

const wave = (i: number, base: number, amp: number, seed: number) =>
  Math.round(base + Math.sin(i / 2.3 + seed) * amp + ((i * 37 + seed * 13) % 11) * (amp / 12))

const conversionSeries = (variants: string[], bases: number[]) =>
  days(14).map((date, i) => {
    const row: Record<string, number | string> = { date }
    variants.forEach((v, vi) => {
      row[v] = Number((bases[vi] + Math.sin(i / 2 + vi) * 0.4 + i * 0.03 * (vi + 1)).toFixed(2))
    })
    return row
  })

export const seedExperiments: Experiment[] = [
  {
    id: 'exp_1',
    name: 'Checkout conversion uplift',
    hypothesis: 'A single-page checkout will increase completed purchases by at least 5%.',
    flagKey: 'new-checkout-flow',
    status: 'running',
    environment: 'production',
    trafficPercentage: 50,
    primaryMetric: 'Purchase completed',
    variants: [
      { id: 'control', name: 'Control', allocation: 50, exposures: 48210, conversions: 3471 },
      { id: 'treatment', name: 'Single-page', allocation: 50, exposures: 48032, conversions: 3889 },
    ],
    dailyConversion: conversionSeries(['Control', 'Single-page'], [7.1, 7.8]),
    startedAt: '2026-11-11T09:00:00Z',
    createdAt: '2026-11-08T15:00:00Z',
  },
  {
    id: 'exp_2',
    name: 'Pricing layout test',
    hypothesis: 'An interactive usage slider increases paid plan selection.',
    flagKey: 'pricing-page-layout',
    status: 'running',
    environment: 'production',
    trafficPercentage: 60,
    primaryMetric: 'Plan selected',
    variants: [
      { id: 'grid', name: 'Grid', allocation: 34, exposures: 22140, conversions: 1240 },
      { id: 'stacked', name: 'Stacked', allocation: 33, exposures: 21560, conversions: 1315 },
      { id: 'slider', name: 'Usage slider', allocation: 33, exposures: 21702, conversions: 1497 },
    ],
    dailyConversion: conversionSeries(['Grid', 'Stacked', 'Usage slider'], [5.5, 6.0, 6.7]),
    startedAt: '2026-11-15T09:00:00Z',
    createdAt: '2026-11-12T10:00:00Z',
  },
  {
    id: 'exp_3',
    name: 'Onboarding checklist activation',
    hypothesis: 'Guided onboarding improves day-7 activation rate.',
    flagKey: 'onboarding-checklist',
    status: 'paused',
    environment: 'production',
    trafficPercentage: 30,
    primaryMetric: 'Day-7 activation',
    variants: [
      { id: 'control', name: 'Control', allocation: 50, exposures: 9120, conversions: 2554 },
      { id: 'checklist', name: 'Checklist', allocation: 50, exposures: 9088, conversions: 2908 },
    ],
    dailyConversion: conversionSeries(['Control', 'Checklist'], [27.8, 31.5]),
    startedAt: '2026-10-28T09:00:00Z',
    createdAt: '2026-10-25T12:00:00Z',
  },
  {
    id: 'exp_4',
    name: 'AI search engagement',
    hypothesis: 'AI-assisted search reduces support ticket volume.',
    flagKey: 'ai-search-assistant',
    status: 'draft',
    environment: 'staging',
    trafficPercentage: 20,
    primaryMetric: 'Docs search success',
    variants: [
      { id: 'control', name: 'Control', allocation: 50, exposures: 0, conversions: 0 },
      { id: 'assistant', name: 'Assistant', allocation: 50, exposures: 0, conversions: 0 },
    ],
    dailyConversion: [],
    createdAt: '2026-11-20T10:00:00Z',
  },
]

export const seedTeam: TeamMember[] = [
  { id: 'usr_1', name: 'Priya Natarajan', email: 'priya@flagforge.dev', role: 'admin', status: 'active', lastActiveAt: '2026-11-25T08:42:00Z' },
  { id: 'usr_2', name: 'Marcus Chen', email: 'marcus@flagforge.dev', role: 'developer', status: 'active', lastActiveAt: '2026-11-25T07:10:00Z' },
  { id: 'usr_3', name: 'Lena Fischer', email: 'lena@flagforge.dev', role: 'developer', status: 'active', lastActiveAt: '2026-11-24T19:30:00Z' },
  { id: 'usr_4', name: 'Jonas Weber', email: 'jonas@flagforge.dev', role: 'admin', status: 'active', lastActiveAt: '2026-11-24T16:05:00Z' },
  { id: 'usr_5', name: 'Sofia Romero', email: 'sofia@flagforge.dev', role: 'viewer', status: 'active', lastActiveAt: '2026-11-21T11:20:00Z' },
  { id: 'usr_6', name: 'Daniel Okafor', email: 'daniel@flagforge.dev', role: 'developer', status: 'invited', lastActiveAt: null },
]

const actor = (i: number) => ({ name: seedTeam[i].name, email: seedTeam[i].email })

export const seedAudit: AuditEvent[] = [
  { id: 'evt_1', actor: actor(0), action: 'flag.rollout_changed', resourceType: 'flag', resourceName: 'new-checkout-flow', environment: 'production', details: 'Rollout changed from 25% to 35%', timestamp: '2026-11-24T16:42:00Z' },
  { id: 'evt_2', actor: actor(1), action: 'experiment.status_changed', resourceType: 'experiment', resourceName: 'Pricing layout test', environment: 'production', details: 'Status changed to running', timestamp: '2026-11-24T14:10:00Z' },
  { id: 'evt_3', actor: actor(2), action: 'flag.toggled', resourceType: 'flag', resourceName: 'ai-search-assistant', environment: 'production', details: 'Flag disabled after latency alert', timestamp: '2026-11-22T18:30:00Z' },
  { id: 'evt_4', actor: actor(3), action: 'rule.updated', resourceType: 'rule', resourceName: 'Enterprise in EU', details: 'Added country condition', timestamp: '2026-11-22T11:05:00Z' },
  { id: 'evt_5', actor: actor(0), action: 'member.invited', resourceType: 'member', resourceName: 'daniel@flagforge.dev', details: 'Invited as developer', timestamp: '2026-11-21T09:00:00Z' },
  { id: 'evt_6', actor: actor(4), action: 'flag.created', resourceType: 'flag', resourceName: 'dashboard-density', environment: 'development', details: 'Multivariate flag created with 2 variants', timestamp: '2026-11-20T09:48:00Z' },
  { id: 'evt_7', actor: actor(1), action: 'flag.rollout_changed', resourceType: 'flag', resourceName: 'realtime-notifications', environment: 'production', details: 'Rollout changed from 60% to 80%', timestamp: '2026-11-19T08:15:00Z' },
  { id: 'evt_8', actor: actor(3), action: 'sdk_key.created', resourceType: 'sdk_key', resourceName: 'Backend API (prod)', environment: 'production', details: 'Server-side SDK key created', timestamp: '2026-11-18T13:00:00Z' },
  { id: 'evt_9', actor: actor(0), action: 'experiment.created', resourceType: 'experiment', resourceName: 'Pricing layout test', environment: 'production', details: 'Experiment created with 3 variants', timestamp: '2026-11-12T10:00:00Z' },
  { id: 'evt_10', actor: actor(2), action: 'member.role_changed', resourceType: 'member', resourceName: 'sofia@flagforge.dev', details: 'Role changed from developer to viewer', timestamp: '2026-11-10T15:30:00Z' },
]

export const seedSdkKeys: SdkKey[] = [
  { id: 'key_1', name: 'Web app (prod)', environment: 'production', type: 'client', lastFour: 'd04e', createdAt: '2026-03-02T10:00:00Z', lastUsedAt: '2026-11-25T08:59:00Z' },
  { id: 'key_2', name: 'Backend API (prod)', environment: 'production', type: 'server', lastFour: '7b21', createdAt: '2026-11-18T13:00:00Z', lastUsedAt: '2026-11-25T09:01:00Z' },
  { id: 'key_3', name: 'Staging services', environment: 'staging', type: 'server', lastFour: '81c2', createdAt: '2026-02-20T10:00:00Z', lastUsedAt: '2026-11-24T22:14:00Z' },
  { id: 'key_4', name: 'Local development', environment: 'development', type: 'client', lastFour: '3f9a', createdAt: '2026-02-11T09:00:00Z', lastUsedAt: '2026-11-25T07:30:00Z' },
]

export const seedWorkspace: Workspace = {
  name: 'Acme Platform',
  slug: 'acme-platform',
  timezone: 'UTC',
  staleFlagDays: 30,
  requireDeleteConfirmation: true,
  auditRetentionDays: 90,
}

const evalDays = days(30)

export const seedAnalytics: AnalyticsSnapshot = {
  evaluations: evalDays.map((date, i) => ({
    date,
    development: wave(i, 42000, 9000, 1),
    staging: wave(i, 86000, 14000, 2),
    production: wave(i, 1240000 + i * 9000, 160000, 3),
  })),
  flagUsage: [
    { key: 'new-checkout-flow', evaluations: 8420000, trend: 12.4 },
    { key: 'realtime-notifications', evaluations: 6130000, trend: 8.1 },
    { key: 'pricing-page-layout', evaluations: 4380000, trend: 22.7 },
    { key: 'eu-data-residency', evaluations: 2910000, trend: 1.2 },
    { key: 'onboarding-checklist', evaluations: 1640000, trend: -4.3 },
    { key: 'ai-search-assistant', evaluations: 910000, trend: -18.6 },
  ],
  conversions: days(14).map((date, i) => ({
    date,
    control: Number((7.1 + Math.sin(i / 2) * 0.35).toFixed(2)),
    treatment: Number((7.7 + Math.sin(i / 2 + 1) * 0.35 + i * 0.03).toFixed(2)),
  })),
  variantComparison: [
    { variant: 'Grid', conversionRate: 5.6, exposures: 22140 },
    { variant: 'Stacked', conversionRate: 6.1, exposures: 21560 },
    { variant: 'Usage slider', conversionRate: 6.9, exposures: 21702 },
    { variant: 'Checkout control', conversionRate: 7.2, exposures: 48210 },
    { variant: 'Single-page', conversionRate: 8.1, exposures: 48032 },
  ],
  totals: { usersEvaluated: 2_384_910, evaluations30d: 41_820_000, avgLatencyMs: 4.2, errorRate: 0.02 },
}
