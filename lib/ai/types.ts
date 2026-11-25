import type {
  AnalyticsSnapshot,
  AuditEvent,
  Environment,
  EnvironmentKey,
  Experiment,
  FeatureFlag,
  TargetingRule,
  TeamMember,
} from '@/lib/types'

/** Read-only snapshot of workspace data the assistant reasons over. */
export interface AssistantContext {
  flags: FeatureFlag[]
  experiments: Experiment[]
  rules: TargetingRule[]
  analytics: AnalyticsSnapshot
  audit: AuditEvent[]
  team: TeamMember[]
  environments: Environment[]
}

export type Tone = 'positive' | 'neutral' | 'caution' | 'negative'

export interface MetricItem {
  label: string
  value: string
  hint?: string
  tone?: Tone
}

export interface VariantResult {
  name: string
  rate: number
  exposures: number
  conversions: number
  isControl?: boolean
  isLeader?: boolean
}

export interface FlagSummaryItem {
  key: string
  name: string
  type: FeatureFlag['type']
  enabled: boolean
  rollout: number
  served: string
  rules: string[]
}

export interface RiskFactor {
  label: string
  status: 'ok' | 'caution' | 'unknown' | 'risk'
  detail: string
}

export type ResponseBlock =
  | { type: 'text'; content: string }
  | { type: 'metrics'; items: MetricItem[] }
  | {
      type: 'comparison'
      title: string
      metric: string
      environment: EnvironmentKey
      status: Experiment['status']
      variants: VariantResult[]
      footnote?: string
    }
  | { type: 'flags'; environment: EnvironmentKey; items: FlagSummaryItem[] }
  | { type: 'risk'; level: 'low' | 'moderate' | 'elevated'; title: string; factors: RiskFactor[] }
  | { type: 'bullets'; title?: string; items: string[] }
  | { type: 'recommendation'; title: string; content: string }
  | { type: 'trends'; title: string; items: Array<{ label: string; value: string; trend: number }> }

export interface AssistantResponse {
  intent: string
  blocks: ResponseBlock[]
  sources: string[]
  followUps: string[]
}

export interface UserMessage {
  id: string
  role: 'user'
  content: string
}

export interface AssistantMessage {
  id: string
  role: 'assistant'
  response: AssistantResponse
}

export interface ErrorMessage {
  id: string
  role: 'error'
  content: string
  retryPrompt: string
}

export type ChatMessage = UserMessage | AssistantMessage | ErrorMessage
