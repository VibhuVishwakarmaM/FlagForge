export type EnvironmentKey = 'development' | 'staging' | 'production'

export interface Environment {
  key: EnvironmentKey
  name: string
  description: string
  requireApproval: boolean
  defaultRollout: number
  sdkKeyHint: string
  createdAt: string
}

export type FlagType = 'boolean' | 'multivariate'

export interface FlagVariant {
  id: string
  name: string
  value: string
  description?: string
}

export interface FlagEnvironmentConfig {
  enabled: boolean
  rollout: number
  ruleIds: string[]
  servedVariantId: string
  fallbackVariantId: string
}

export interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string
  type: FlagType
  tags: string[]
  owner: string
  variants: FlagVariant[]
  environments: Record<EnvironmentKey, FlagEnvironmentConfig>
  createdAt: string
  updatedAt: string
}

export interface CreateFlagInput {
  name: string
  key: string
  description: string
  type: FlagType
  tags: string[]
  variants: Omit<FlagVariant, 'id'>[]
}

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'in'
  | 'greater_than'
  | 'less_than'

export interface RuleCondition {
  id: string
  attribute: string
  operator: RuleOperator
  value: string
}

export type RuleCombinator = 'AND' | 'OR'

export interface TargetingRule {
  id: string
  name: string
  description: string
  combinator: RuleCombinator
  conditions: RuleCondition[]
  createdAt: string
  updatedAt: string
}

export type CreateRuleInput = Pick<TargetingRule, 'name' | 'description' | 'combinator'> & {
  conditions: Omit<RuleCondition, 'id'>[]
}

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed'

export interface ExperimentVariant {
  id: string
  name: string
  allocation: number
  exposures: number
  conversions: number
}

export interface Experiment {
  id: string
  name: string
  hypothesis: string
  flagKey: string
  status: ExperimentStatus
  environment: EnvironmentKey
  trafficPercentage: number
  primaryMetric: string
  variants: ExperimentVariant[]
  dailyConversion: Array<Record<string, number | string>>
  startedAt?: string
  createdAt: string
}

export interface CreateExperimentInput {
  name: string
  hypothesis: string
  flagKey: string
  environment: EnvironmentKey
  trafficPercentage: number
  primaryMetric: string
  variants: Array<Pick<ExperimentVariant, 'name' | 'allocation'>>
}

export type Role = 'admin' | 'developer' | 'viewer'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: Role
  status: 'active' | 'invited'
  lastActiveAt: string | null
}

export type AuditAction =
  | 'flag.created'
  | 'flag.updated'
  | 'flag.deleted'
  | 'flag.toggled'
  | 'flag.rollout_changed'
  | 'experiment.created'
  | 'experiment.status_changed'
  | 'experiment.deleted'
  | 'rule.created'
  | 'rule.updated'
  | 'rule.deleted'
  | 'member.invited'
  | 'member.role_changed'
  | 'member.removed'
  | 'sdk_key.created'
  | 'sdk_key.revoked'
  | 'workspace.updated'

export type ResourceType = 'flag' | 'experiment' | 'rule' | 'member' | 'sdk_key' | 'workspace'

export interface AuditEvent {
  id: string
  actor: { name: string; email: string }
  action: AuditAction
  resourceType: ResourceType
  resourceName: string
  environment?: EnvironmentKey
  details: string
  timestamp: string
}

export interface EvaluationUser {
  key: string
  attributes: Record<string, string>
}

export interface EvaluationResult {
  enabled: boolean
  variant: FlagVariant | null
  reason: 'FLAG_DISABLED' | 'RULE_MATCH' | 'ROLLOUT' | 'OUT_OF_ROLLOUT' | 'FALLTHROUGH'
  matchedRule?: TargetingRule
  bucket: number
}

export interface SdkKey {
  id: string
  name: string
  environment: EnvironmentKey
  type: 'client' | 'server'
  lastFour: string
  createdAt: string
  lastUsedAt: string | null
}

export interface Workspace {
  name: string
  slug: string
  timezone: string
  staleFlagDays: number
  requireDeleteConfirmation: boolean
  auditRetentionDays: number
}

export interface AnalyticsSnapshot {
  evaluations: Array<{ date: string; development: number; staging: number; production: number }>
  flagUsage: Array<{ key: string; evaluations: number; trend: number }>
  conversions: Array<{ date: string; control: number; treatment: number }>
  variantComparison: Array<{ variant: string; conversionRate: number; exposures: number }>
  totals: { usersEvaluated: number; evaluations30d: number; avgLatencyMs: number; errorRate: number }
}
