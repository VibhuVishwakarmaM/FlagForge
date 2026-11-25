import type {
  EnvironmentKey,
  EvaluationResult,
  EvaluationUser,
  FeatureFlag,
  RuleCondition,
  TargetingRule,
} from '@/lib/types'

/** Deterministic 0–99 bucket so a user always lands in the same rollout slice. */
export function bucketFor(flagKey: string, userKey: string) {
  let hash = 2166136261
  const input = `${flagKey}:${userKey}`
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export function matchesCondition(condition: RuleCondition, user: EvaluationUser) {
  const actual = condition.attribute === 'key' ? user.key : user.attributes[condition.attribute]
  if (actual === undefined || actual === '') return condition.operator === 'not_equals'
  const expected = condition.value.trim()
  const a = String(actual).trim()
  switch (condition.operator) {
    case 'equals':
      return a.toLowerCase() === expected.toLowerCase()
    case 'not_equals':
      return a.toLowerCase() !== expected.toLowerCase()
    case 'contains':
      return a.toLowerCase().includes(expected.toLowerCase())
    case 'in':
      return expected
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .includes(a.toLowerCase())
    case 'greater_than':
      return Number(a) > Number(expected)
    case 'less_than':
      return Number(a) < Number(expected)
  }
}

export function matchesRule(rule: TargetingRule, user: EvaluationUser) {
  if (rule.conditions.length === 0) return false
  return rule.combinator === 'AND'
    ? rule.conditions.every((c) => matchesCondition(c, user))
    : rule.conditions.some((c) => matchesCondition(c, user))
}

export function evaluateFlag(
  flag: FeatureFlag,
  env: EnvironmentKey,
  user: EvaluationUser,
  rules: TargetingRule[],
): EvaluationResult {
  const config = flag.environments[env]
  const served = flag.variants.find((v) => v.id === config.servedVariantId) ?? flag.variants[0] ?? null
  const fallback = flag.variants.find((v) => v.id === config.fallbackVariantId) ?? null
  const bucket = bucketFor(flag.key, user.key || 'anonymous')

  if (!config.enabled) return { enabled: false, variant: fallback, reason: 'FLAG_DISABLED', bucket }

  const attached = rules.filter((r) => config.ruleIds.includes(r.id))
  const matchedRule = attached.find((r) => matchesRule(r, user))
  if (matchedRule) return { enabled: true, variant: served, reason: 'RULE_MATCH', matchedRule, bucket }

  if (bucket < config.rollout) return { enabled: true, variant: served, reason: 'ROLLOUT', bucket }
  return { enabled: true, variant: fallback, reason: attached.length ? 'FALLTHROUGH' : 'OUT_OF_ROLLOUT', bucket }
}

export const reasonLabels: Record<EvaluationResult['reason'], string> = {
  FLAG_DISABLED: 'Flag is disabled in this environment — serving fallback.',
  RULE_MATCH: 'Matched a targeting rule — serving the targeted variant.',
  ROLLOUT: 'Inside the percentage rollout — serving the targeted variant.',
  OUT_OF_ROLLOUT: 'Outside the percentage rollout — serving fallback.',
  FALLTHROUGH: 'No rule matched and outside rollout — serving fallback.',
}
