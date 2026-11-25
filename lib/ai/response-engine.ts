import { roleDescriptions } from '@/components/team/team-view'
import { environmentKeys, environmentLabels, formatCompact, formatNumber, formatPercent, formatRelative, operatorLabels } from '@/lib/format'
import type { EnvironmentKey, Experiment, ExperimentVariant, FeatureFlag, Role } from '@/lib/types'
import type { AssistantContext, AssistantResponse, FlagSummaryItem, ResponseBlock, RiskFactor, VariantResult } from './types'

export const UNKNOWN_ANSWER =
  "I don't have enough connected FlagForge data to answer that yet. This demo assistant currently supports flag, experiment, rollout, and analytics questions."

const SOURCES = {
  flags: 'Feature flags',
  experiments: 'Experiments',
  analytics: 'Analytics snapshot',
  audit: 'Audit log',
  rules: 'Targeting rules',
  team: 'Team & access',
  environments: 'Environments',
} as const

/* ---------- Data helpers ---------- */

const conversionRate = (v: Pick<ExperimentVariant, 'exposures' | 'conversions'>) =>
  v.exposures > 0 ? (v.conversions / v.exposures) * 100 : 0

const relativeLift = (baseline: number, candidate: number) => (baseline > 0 ? ((candidate - baseline) / baseline) * 100 : 0)

const signed = (n: number, digits = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`

function baselineVariant(exp: Experiment) {
  return exp.variants.find((v) => v.id === 'control' || v.name.toLowerCase() === 'control') ?? exp.variants[0]
}

function variantResults(exp: Experiment): VariantResult[] {
  const baseline = baselineVariant(exp)
  const results = exp.variants.map((v) => ({
    name: v.name,
    rate: conversionRate(v),
    exposures: v.exposures,
    conversions: v.conversions,
    isControl: v.id === baseline?.id,
  }))
  const hasData = results.some((r) => r.exposures > 0)
  const top = hasData ? Math.max(...results.map((r) => r.rate)) : -1
  return results.map((r) => ({ ...r, isLeader: hasData && r.rate === top }))
}

function leader(exp: Experiment) {
  return variantResults(exp).find((r) => r.isLeader)
}

const ruleNames = (ids: string[], ctx: AssistantContext) =>
  ids.map((id) => ctx.rules.find((r) => r.id === id)?.name ?? id)

const variantName = (flag: FeatureFlag, id: string) => flag.variants.find((v) => v.id === id)?.name ?? id

function flagSummary(flag: FeatureFlag, env: EnvironmentKey, ctx: AssistantContext): FlagSummaryItem {
  const config = flag.environments[env]
  return {
    key: flag.key,
    name: flag.name,
    type: flag.type,
    enabled: config.enabled,
    rollout: config.rollout,
    served: variantName(flag, config.servedVariantId),
    rules: ruleNames(config.ruleIds, ctx),
  }
}

const daysSince = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : 0)

const experimentForFlag = (flagKey: string, ctx: AssistantContext) =>
  ctx.experiments.find((e) => e.flagKey === flagKey && e.status === 'running') ??
  ctx.experiments.find((e) => e.flagKey === flagKey)

/* ---------- Entity detection ---------- */

const STOP_WORDS = new Set([
  'test', 'experiment', 'conversion', 'uplift', 'activation', 'engagement', 'flow', 'new', 'page', 'assistant', 'the', 'data',
])

function findFlag(q: string, flags: FeatureFlag[]) {
  return flags.find(
    (f) =>
      q.includes(f.key) || q.includes(f.name.toLowerCase()) || q.includes(f.key.replace(/-/g, ' ')),
  )
}

function findExperiment(q: string, experiments: Experiment[]) {
  const direct = experiments.find((e) => q.includes(e.name.toLowerCase()) || q.includes(e.flagKey))
  if (direct) return direct
  return experiments.find((e) => {
    const words = [...e.flagKey.split('-'), ...e.name.toLowerCase().split(/\s+/)]
    return words.some((w) => w.length > 3 && !STOP_WORDS.has(w) && new RegExp(`\\b${w}\\b`).test(q))
  })
}

function findEnvironment(q: string): EnvironmentKey | undefined {
  if (/\bprod(uction)?\b/.test(q)) return 'production'
  if (/\bstag(ing|e)\b/.test(q)) return 'staging'
  if (/\bdev(elopment)?\b/.test(q)) return 'development'
  return undefined
}

function findTargetPercent(q: string) {
  const match = q.match(/(\d{1,3})\s*(%|percent)/) ?? q.match(/\bto\s+(\d{1,3})\b/)
  if (!match) return undefined
  const n = Number(match[1])
  return n >= 0 && n <= 100 ? n : undefined
}

/* ---------- Glossary ---------- */

const GLOSSARY: Array<{ pattern: RegExp; term: string; build: (ctx: AssistantContext) => ResponseBlock[] }> = [
  {
    pattern: /(relative )?lift|conversion rate.*lift|lift.*conversion rate/,
    term: 'Conversion rate vs. relative lift',
    build: (ctx) => {
      const exp = ctx.experiments.find((e) => e.flagKey === 'new-checkout-flow') ?? ctx.experiments[0]
      const [a, b] = variantResults(exp)
      const blocks: ResponseBlock[] = [
        {
          type: 'bullets',
          items: [
            'Conversion rate is the share of exposed users who completed the primary metric: conversions ÷ exposures.',
            'Absolute difference is the gap between two rates, measured in percentage points (pp).',
            'Relative lift expresses that gap as a share of the baseline rate: (treatment − control) ÷ control.',
          ],
        },
      ]
      if (a && b) {
        blocks.push({
          type: 'text',
          content: `Example from ${exp.name}: ${a.name} converts at ${formatPercent(a.rate, 2)} and ${b.name} at ${formatPercent(b.rate, 2)}. That is a ${(b.rate - a.rate).toFixed(2)} pp absolute difference, or ${signed(relativeLift(a.rate, b.rate))}% relative lift.`,
        })
      }
      return blocks
    },
  },
  {
    pattern: /multivariate|multi-variant/,
    term: 'Multivariate flags',
    build: (ctx) => [
      {
        type: 'text',
        content: `A multivariate flag serves one of several named variants instead of a simple on/off value. Your workspace has ${ctx.flags.filter((f) => f.type === 'multivariate').length} multivariate flags: ${ctx.flags.filter((f) => f.type === 'multivariate').map((f) => `${f.key} (${f.variants.map((v) => v.name).join(', ')})`).join('; ')}.`,
      },
    ],
  },
  {
    pattern: /boolean flag/,
    term: 'Boolean flags',
    build: (ctx) => [
      {
        type: 'text',
        content: `A boolean flag has exactly two variants — On (true) and Off (false). ${ctx.flags.filter((f) => f.type === 'boolean').length} of your ${ctx.flags.length} flags are boolean.`,
      },
    ],
  },
  {
    pattern: /percentage rollout|rollout percentage|what is (a )?rollout/,
    term: 'Percentage rollouts',
    build: () => [
      {
        type: 'bullets',
        items: [
          'A percentage rollout serves the flag to a stable slice of users, bucketed by a hash of their user key.',
          'The same user always lands in the same bucket, so their experience stays consistent as the rollout grows.',
          'Users outside the rollout receive the fallback variant. Targeting rules are evaluated before rollout bucketing.',
        ],
      },
    ],
  },
  {
    pattern: /statistical(ly)? significan|p-value|confidence interval/,
    term: 'Statistical significance',
    build: () => [
      {
        type: 'bullets',
        items: [
          'Statistical significance estimates how unlikely an observed difference would be if the variants actually performed the same.',
          'FlagForge experiment data in this demo includes exposures and conversions only — no p-values or confidence intervals are reported.',
          'Treat observed leads as directional until a proper significance test confirms them.',
        ],
      },
    ],
  },
  {
    pattern: /kill switch/,
    term: 'Kill switches',
    build: (ctx) => {
      const killSwitches = ctx.flags.filter((f) => f.tags.includes('kill-switch'))
      return [
        {
          type: 'text',
          content: `A kill switch is a flag used to instantly disable functionality without a deploy. Flags tagged kill-switch in your workspace: ${killSwitches.length ? killSwitches.map((f) => f.key).join(', ') : 'none'}.`,
        },
      ]
    },
  },
  {
    pattern: /\bexposures?\b|\bcontrol\b.*\btreatment\b|\btreatment\b/,
    term: 'Exposures, control and treatment',
    build: () => [
      {
        type: 'bullets',
        items: [
          'An exposure is recorded when a user is evaluated into an experiment variant.',
          'The control is the baseline experience; treatments are the variants being tested against it.',
          'Conversion rate per variant = conversions ÷ exposures for that variant.',
        ],
      },
    ],
  },
]

/* ---------- Intent builders ---------- */

function experimentComparisonBlock(exp: Experiment): ResponseBlock {
  return {
    type: 'comparison',
    title: exp.name,
    metric: exp.primaryMetric,
    environment: exp.environment,
    status: exp.status,
    variants: variantResults(exp),
  }
}

function experimentsOverview(ctx: AssistantContext, askedForBest: boolean): AssistantResponse {
  const running = ctx.experiments.filter((e) => e.status === 'running')
  const others = ctx.experiments.filter((e) => e.status !== 'running')
  const pricing = running.find((e) => e.flagKey === 'pricing-page-layout')
  const ordered = askedForBest && pricing ? [pricing, ...running.filter((e) => e !== pricing)] : running

  const leaderLines = ordered.map((exp) => {
    const top = leader(exp)
    const base = baselineVariant(exp)
    const baseRate = base ? conversionRate(base) : 0
    if (!top) return `${exp.name}: no exposures recorded yet.`
    const runnerUps = variantResults(exp)
      .filter((v) => !v.isLeader)
      .map((v) => `${v.name} ${formatPercent(v.rate, 2)}`)
      .join(', ')
    const lift = top.isControl ? '' : ` (${signed(relativeLift(baseRate, top.rate))}% relative vs. ${base?.name})`
    return `${exp.name}: ${top.name} leads at ${formatPercent(top.rate, 2)}${lift}. Others: ${runnerUps}.`
  })

  const blocks: ResponseBlock[] = [
    {
      type: 'text',
      content: askedForBest
        ? `Experiments measure different primary metrics, so I compare variants within each test rather than across them. In the Pricing layout test, Usage slider currently has the highest observed conversion rate.`
        : `You have ${running.length} running experiment${running.length === 1 ? '' : 's'}${others.length ? ` and ${others.length} not currently running` : ''}. Here is how each running test is performing on its primary metric.`,
    },
    ...ordered.map(experimentComparisonBlock),
    { type: 'bullets', title: 'Current leaders', items: leaderLines },
  ]

  if (others.length) {
    blocks.push({
      type: 'bullets',
      title: 'Not running',
      items: others.map((e) => `${e.name} — ${e.status} in ${environmentLabels[e.environment]}${e.variants.every((v) => v.exposures === 0) ? ', no exposures yet' : ''}.`),
    })
  }

  blocks.push({
    type: 'recommendation',
    title: 'Interpret with care',
    content:
      'These are observed conversion rates only. The demo data does not include p-values or confidence intervals, so no lead here is confirmed as statistically significant.',
  })

  return {
    intent: 'experiments.overview',
    blocks,
    sources: [SOURCES.experiments],
    followUps: ['Analyze the checkout experiment', 'Explain conversion rate vs. relative lift', 'Identify rollout risks'],
  }
}

function experimentAnalysis(exp: Experiment, ctx: AssistantContext): AssistantResponse {
  const results = variantResults(exp)
  const base = results.find((r) => r.isControl) ?? results[0]
  const challengers = results.filter((r) => r !== base)
  const hasData = results.some((r) => r.exposures > 0)
  const blocks: ResponseBlock[] = [
    {
      type: 'text',
      content: `${exp.name} is ${exp.status} in ${environmentLabels[exp.environment]} on ${exp.trafficPercentage}% of traffic${exp.startedAt ? `, started ${daysSince(exp.startedAt)} days ago` : ''}. Hypothesis: “${exp.hypothesis}”`,
    },
  ]

  if (!hasData) {
    blocks.push({ type: 'text', content: 'No exposures have been recorded yet, so there are no results to analyze.' })
    return {
      intent: 'experiments.detail',
      blocks,
      sources: [SOURCES.experiments],
      followUps: ['Analyze my running experiments', 'Explain my Production flags'],
    }
  }

  if (challengers.length === 1) {
    const [challenger] = challengers
    const diff = challenger.rate - base.rate
    const lift = relativeLift(base.rate, challenger.rate)
    blocks.push(
      {
        type: 'metrics',
        items: [
          { label: base.name, value: formatPercent(base.rate, 2), hint: `${formatNumber(base.exposures)} exposures` },
          { label: challenger.name, value: formatPercent(challenger.rate, 2), hint: `${formatNumber(challenger.exposures)} exposures` },
          { label: 'Absolute difference', value: `${signed(diff, 2)} pp`, tone: diff >= 0 ? 'positive' : 'negative' },
          { label: 'Relative lift', value: `${signed(lift)}%`, tone: lift >= 0 ? 'positive' : 'negative' },
        ],
      },
      experimentComparisonBlock(exp),
      {
        type: 'bullets',
        title: 'Conversion rate vs. relative lift',
        items: [
          `Conversion rate = conversions ÷ exposures. ${base.name}: ${formatNumber(base.conversions)} ÷ ${formatNumber(base.exposures)} = ${formatPercent(base.rate, 2)}. ${challenger.name}: ${formatNumber(challenger.conversions)} ÷ ${formatNumber(challenger.exposures)} = ${formatPercent(challenger.rate, 2)}.`,
          `The absolute difference is ${diff.toFixed(2)} percentage points — the raw gap between the two rates.`,
          `Relative lift divides that gap by the control rate: ${diff.toFixed(2)} ÷ ${base.rate.toFixed(2)} = ${signed(lift)}%. It sounds larger because it is relative to a small base rate.`,
        ],
      },
    )
  } else {
    blocks.push(experimentComparisonBlock(exp), {
      type: 'bullets',
      title: `Compared with ${base.name} (${formatPercent(base.rate, 2)})`,
      items: challengers.map(
        (c) => `${c.name}: ${formatPercent(c.rate, 2)} — ${signed(c.rate - base.rate, 2)} pp, ${signed(relativeLift(base.rate, c.rate))}% relative.`,
      ),
    })
  }

  const flag = ctx.flags.find((f) => f.key === exp.flagKey)
  if (flag) {
    const prod = flag.environments.production
    blocks.push({
      type: 'text',
      content: `Linked flag ${flag.key} is ${prod.enabled ? 'enabled' : 'disabled'} in Production at ${prod.rollout}% rollout, serving ${variantName(flag, prod.servedVariantId)}.`,
    })
  }

  blocks.push({
    type: 'recommendation',
    title: 'Observed, not proven',
    content:
      'The leader shown is based on observed rates only. Statistical significance is not reported in this data, so confirm the result with a significance test before treating it as a winner.',
  })

  return {
    intent: 'experiments.detail',
    blocks,
    sources: [SOURCES.experiments, SOURCES.flags],
    followUps: flag
      ? [`Should I increase ${flag.key} to 70%?`, 'Which experiment is performing best?', 'Explain statistical significance']
      : ['Which experiment is performing best?'],
  }
}

function environmentFlags(env: EnvironmentKey, ctx: AssistantContext): AssistantResponse {
  const items = ctx.flags.map((f) => flagSummary(f, env, ctx))
  const enabled = items.filter((i) => i.enabled)
  const partial = enabled.filter((i) => i.rollout < 100)
  const full = enabled.filter((i) => i.rollout === 100)
  const disabled = items.filter((i) => !i.enabled)
  const targeted = enabled.filter((i) => i.rules.length)
  const envMeta = ctx.environments.find((e) => e.key === env)

  const highlights: string[] = []
  if (full.length) highlights.push(`Fully rolled out (100%): ${full.map((i) => i.key).join(', ')}.`)
  if (partial.length)
    highlights.push(`Partial rollouts: ${partial.map((i) => `${i.key} at ${i.rollout}%`).join(', ')}.`)
  if (disabled.length) highlights.push(`Disabled: ${disabled.map((i) => i.key).join(', ')}.`)
  if (targeted.length)
    highlights.push(`Using targeting rules: ${targeted.map((i) => `${i.key} → ${i.rules.join(', ')}`).join('; ')}.`)
  const multivariate = enabled.filter((i) => i.type === 'multivariate')
  if (multivariate.length)
    highlights.push(`Multivariate flags serving: ${multivariate.map((i) => `${i.key} → ${i.served}`).join(', ')}.`)

  return {
    intent: 'flags.environment',
    blocks: [
      {
        type: 'text',
        content: `Here is the current configuration of your ${ctx.flags.length} flags in ${environmentLabels[env]}.${envMeta?.requireApproval ? ' Changes in this environment are logged and require confirmation.' : ''}`,
      },
      {
        type: 'metrics',
        items: [
          { label: 'Enabled', value: String(enabled.length), hint: `of ${items.length} flags`, tone: 'positive' },
          { label: 'Partial rollout', value: String(partial.length), hint: 'below 100%', tone: partial.length ? 'caution' : 'neutral' },
          { label: 'Disabled', value: String(disabled.length), tone: 'neutral' },
          { label: 'Rule-targeted', value: String(targeted.length), tone: 'neutral' },
        ],
      },
      { type: 'flags', environment: env, items },
      { type: 'bullets', title: 'Highlights', items: highlights },
    ],
    sources: [SOURCES.flags, SOURCES.rules, SOURCES.environments],
    followUps: ['Identify rollout risks', 'Explain the new-checkout-flow flag', env === 'production' ? 'Explain my Staging flags' : 'Explain my Production flags'],
  }
}

function flagDetail(flag: FeatureFlag, ctx: AssistantContext): AssistantResponse {
  const usage = ctx.analytics.flagUsage.find((u) => u.key === flag.key)
  const exp = experimentForFlag(flag.key, ctx)
  const events = ctx.audit.filter((e) => e.resourceName === flag.key).slice(0, 3)

  const blocks: ResponseBlock[] = [
    {
      type: 'text',
      content: `${flag.name} (${flag.key}) is a ${flag.type} flag owned by ${flag.owner}. ${flag.description}`,
    },
    {
      type: 'metrics',
      items: environmentKeys.map((env) => {
        const c = flag.environments[env]
        return {
          label: environmentLabels[env],
          value: c.enabled ? `${c.rollout}%` : 'Off',
          hint: c.enabled ? `serving ${variantName(flag, c.servedVariantId)}` : `fallback ${variantName(flag, c.fallbackVariantId)}`,
          tone: !c.enabled ? 'neutral' : c.rollout < 100 ? 'caution' : 'positive',
        }
      }),
    },
  ]

  const details = [
    `Variants: ${flag.variants.map((v) => v.name).join(', ')}.`,
    `Tags: ${flag.tags.join(', ') || 'none'}.`,
  ]
  const prodRules = ruleNames(flag.environments.production.ruleIds, ctx)
  if (prodRules.length) details.push(`Production targeting rules: ${prodRules.join(', ')} — matched users are served before rollout bucketing.`)
  if (usage) details.push(`${formatCompact(usage.evaluations)} evaluations in the last 30 days (${signed(usage.trend)}% trend).`)
  blocks.push({ type: 'bullets', title: 'Configuration', items: details })

  if (exp) blocks.push(experimentComparisonBlock(exp))

  if (events.length) {
    blocks.push({
      type: 'bullets',
      title: 'Recent changes',
      items: events.map((e) => `${formatRelative(e.timestamp)} — ${e.actor.name}: ${e.details}${e.environment ? ` (${environmentLabels[e.environment]})` : ''}.`),
    })
  }

  const sources: string[] = [SOURCES.flags, SOURCES.rules]
  if (usage) sources.push(SOURCES.analytics)
  if (exp) sources.push(SOURCES.experiments)
  if (events.length) sources.push(SOURCES.audit)

  return {
    intent: 'flags.detail',
    blocks,
    sources,
    followUps: [
      ...(exp ? [`Analyze the ${exp.name.toLowerCase()} experiment`] : []),
      `Should I increase ${flag.key} to ${Math.min(100, flag.environments.production.rollout + 35)}%?`,
      'Explain my Production flags',
    ],
  }
}

function rolloutAdvice(flag: FeatureFlag, target: number | undefined, ctx: AssistantContext): AssistantResponse {
  const prod = flag.environments.production
  const current = prod.enabled ? prod.rollout : 0
  const desired = target ?? Math.min(100, current + 25)
  const step = desired - current
  const exp = experimentForFlag(flag.key, ctx)
  const lastRolloutChange = ctx.audit.find((e) => e.resourceName === flag.key && e.action === 'flag.rollout_changed')
  const factors: RiskFactor[] = []
  const blocks: ResponseBlock[] = []

  if (step <= 0) {
    return {
      intent: 'rollout.advice',
      blocks: [
        {
          type: 'text',
          content: `${flag.key} is already at ${current}% in Production, so ${desired}% would be ${step === 0 ? 'no change' : 'a reduction'}. Reducing rollout is generally the lower-risk direction, but it will change which users see the feature.`,
        },
      ],
      sources: [SOURCES.flags],
      followUps: ['Identify rollout risks', `Explain the ${flag.key} flag`],
    }
  }

  blocks.push({
    type: 'metrics',
    items: [
      { label: 'Current Production rollout', value: `${current}%`, hint: prod.enabled ? 'enabled' : 'disabled' },
      { label: 'Proposed', value: `${desired}%`, hint: `${signed(step, 0)} pp change`, tone: step > 25 ? 'caution' : 'neutral' },
    ],
  })

  if (exp) {
    const results = variantResults(exp)
    const base = results.find((r) => r.isControl) ?? results[0]
    const treatment = results.find((r) => !r.isControl)
    if (base && treatment && base.exposures > 0) {
      const lift = relativeLift(base.rate, treatment.rate)
      factors.push({
        label: 'Observed conversion',
        status: lift > 0 ? 'ok' : 'risk',
        detail: `${treatment.name} ${formatPercent(treatment.rate, 2)} vs. ${base.name} ${formatPercent(base.rate, 2)} (${signed(lift)}% relative lift) in ${exp.name}.`,
      })
      const minExposures = Math.min(...results.map((r) => r.exposures))
      factors.push({
        label: 'Sample size',
        status: minExposures >= 10_000 ? 'ok' : 'caution',
        detail: `${formatNumber(minExposures)}+ exposures per variant over ${daysSince(exp.startedAt)} days.`,
      })
      const totalAlloc = results.reduce((s, r) => s + r.exposures, 0)
      const expectedShare = (exp.variants.find((v) => v.name === base.name)?.allocation ?? 50) / 100
      const actualShare = base.exposures / totalAlloc
      const imbalance = Math.abs(actualShare - expectedShare) * 100
      factors.push({
        label: 'Sample quality',
        status: imbalance < 1 ? 'ok' : 'caution',
        detail: `Exposure split is ${(actualShare * 100).toFixed(1)}% / ${((1 - actualShare) * 100).toFixed(1)}% vs. configured ${expectedShare * 100}% allocation — ${imbalance < 1 ? 'no obvious sample ratio mismatch' : 'possible sample ratio mismatch'}. Bot traffic and novelty effects are not assessed.`,
      })
    }
    factors.push({
      label: 'Running experiment',
      status: exp.status === 'running' ? 'caution' : 'ok',
      detail:
        exp.status === 'running'
          ? `${exp.name} is still running on ${exp.trafficPercentage}% of traffic. Changing rollout mid-test can shift who is exposed and bias results.`
          : `${exp.name} is ${exp.status}.`,
    })
  } else {
    factors.push({ label: 'Experiment evidence', status: 'unknown', detail: 'No experiment is linked to this flag.' })
  }

  factors.push({
    label: 'Statistical significance',
    status: 'unknown',
    detail: 'Not reported in FlagForge data — no p-value or confidence interval is available.',
  })
  factors.push({
    label: 'Error rates & latency',
    status: 'unknown',
    detail: `Only platform-wide metrics exist (${ctx.analytics.totals.errorRate}% error rate, ${ctx.analytics.totals.avgLatencyMs} ms avg evaluation latency). No flag-level guardrail metrics are connected.`,
  })
  if (lastRolloutChange) {
    factors.push({
      label: 'Recent rollout change',
      status: daysSince(lastRolloutChange.timestamp) < 7 ? 'caution' : 'ok',
      detail: `${lastRolloutChange.details} ${formatRelative(lastRolloutChange.timestamp)} by ${lastRolloutChange.actor.name}.`,
    })
  }

  const cautions = factors.filter((f) => f.status === 'caution' || f.status === 'risk').length
  const level = factors.some((f) => f.status === 'risk') || step > 30 ? 'elevated' : cautions > 1 ? 'moderate' : 'low'
  const mid = Math.round((current + desired) / 2 / 5) * 5
  const stages = mid > current && mid < desired ? `${current}% → ${mid}% → ${desired}%` : `${current}% → ${desired}%`

  blocks.push(
    {
      type: 'text',
      content: `The observed conversion lift is encouraging, but historical lift alone does not prove that a ${step} pp jump to ${desired}% is safe. Lift measures one business metric; it says nothing about errors, latency, or behavior on the newly exposed users.`,
    },
    { type: 'risk', level, title: `Risk assessment for ${flag.key} → ${desired}%`, factors },
    {
      type: 'bullets',
      title: 'Before increasing',
      items: [
        'Confirm statistical significance for the primary metric rather than relying on the observed lift.',
        'Define guardrails (checkout errors, payment failures, latency) and confirm they are monitored for this flag.',
        'Decide whether to conclude the running experiment first so the ramp does not bias its results.',
        'Have a rollback plan — disabling the flag in Production immediately reverts users to the fallback variant.',
      ],
    },
    {
      type: 'recommendation',
      title: 'Suggested approach',
      content: `Consider a staged ramp (${stages}) with a monitoring window at each step instead of a single jump. Production changes require confirmation and are recorded in the audit log. I can only advise — I have not changed this flag.`,
    },
  )

  return {
    intent: 'rollout.advice',
    blocks,
    sources: [SOURCES.flags, ...(exp ? [SOURCES.experiments] : []), SOURCES.analytics, SOURCES.audit],
    followUps: ['Analyze the checkout experiment', 'Explain statistical significance', 'Identify rollout risks'],
  }
}

function riskScan(ctx: AssistantContext): AssistantResponse {
  const factors: RiskFactor[] = []
  const recentWindowDays = 7

  for (const flag of ctx.flags) {
    const prod = flag.environments.production
    const usage = ctx.analytics.flagUsage.find((u) => u.key === flag.key)
    const exp = ctx.experiments.find((e) => e.flagKey === flag.key && e.status === 'running')
    const alertToggle = ctx.audit.find(
      (e) => e.resourceName === flag.key && e.action === 'flag.toggled' && /alert|incident|error|latency/i.test(e.details),
    )
    const recentRamp = ctx.audit.find(
      (e) => e.resourceName === flag.key && e.action === 'flag.rollout_changed' && daysSince(e.timestamp) < recentWindowDays,
    )

    if (alertToggle) {
      factors.push({
        label: flag.key,
        status: 'risk',
        detail: `${alertToggle.details} (${formatRelative(alertToggle.timestamp)}). Usage trend ${usage ? `${signed(usage.trend)}%` : 'unknown'}. Investigate before re-enabling.`,
      })
      continue
    }
    if (exp && prod.enabled && prod.rollout < 100) {
      const top = leader(exp)
      const servedName = variantName(flag, prod.servedVariantId)
      const mismatch = flag.type === 'multivariate' && top && top.name !== servedName
      factors.push({
        label: flag.key,
        status: 'caution',
        detail: `Partial rollout (${prod.rollout}%) overlaps the running “${exp.name}” experiment${recentRamp ? `; ${recentRamp.details.toLowerCase()} ${formatRelative(recentRamp.timestamp)}` : ''}.${mismatch ? ` Production serves ${servedName} while ${top?.name} leads the experiment.` : ''} Avoid ramping until results are concluded.`,
      })
      continue
    }
    if (recentRamp) {
      factors.push({
        label: flag.key,
        status: 'caution',
        detail: `${recentRamp.details} ${formatRelative(recentRamp.timestamp)}. Watch error and latency guardrails before the next step.`,
      })
      continue
    }
    if (usage && usage.trend <= -10) {
      factors.push({ label: flag.key, status: 'caution', detail: `Evaluations down ${Math.abs(usage.trend)}% — confirm this is expected.` })
      continue
    }
    if (flag.tags.includes('kill-switch') && prod.enabled && /legacy|deprecated/i.test(`${flag.key} ${flag.description}`)) {
      factors.push({
        label: flag.key,
        status: 'caution',
        detail: `Deprecated functionality is still enabled at ${prod.rollout}% in Production. Plan its retirement and keep the kill switch ready.`,
      })
    }
  }

  const risks = factors.filter((f) => f.status === 'risk').length
  const cautions = factors.filter((f) => f.status === 'caution').length
  const flagged = new Set(factors.map((f) => f.label))
  const stable = ctx.flags.filter((f) => !flagged.has(f.key)).map((f) => f.key)

  return {
    intent: 'rollout.risks',
    blocks: [
      {
        type: 'text',
        content: `I scanned Production configuration, running experiments, recent audit events and usage trends. ${risks} flag${risks === 1 ? ' needs' : 's need'} attention and ${cautions} ${cautions === 1 ? 'warrants' : 'warrant'} caution.`,
      },
      {
        type: 'metrics',
        items: [
          { label: 'Needs attention', value: String(risks), tone: risks ? 'negative' : 'neutral' },
          { label: 'Caution', value: String(cautions), tone: cautions ? 'caution' : 'neutral' },
          { label: 'No signals', value: String(stable.length), tone: 'positive' },
        ],
      },
      { type: 'risk', level: risks ? 'elevated' : cautions ? 'moderate' : 'low', title: 'Production rollout signals', factors },
      ...(stable.length
        ? [{ type: 'bullets' as const, title: 'No risk signals detected', items: [stable.join(', ')] }]
        : []),
      {
        type: 'recommendation',
        title: 'Keep in mind',
        content:
          'This scan only uses configuration, audit and aggregate usage data. Flag-level error rates and latency are not connected yet, so absence of a signal is not proof of safety.',
      },
    ],
    sources: [SOURCES.flags, SOURCES.experiments, SOURCES.audit, SOURCES.analytics],
    followUps: ['Should I increase new-checkout-flow to 70%?', 'Explain the ai-search-assistant flag', 'Show recent audit activity'],
  }
}

function analyticsSummary(ctx: AssistantContext): AssistantResponse {
  const { totals, evaluations, flagUsage } = ctx.analytics
  const sum = (rows: typeof evaluations, key: EnvironmentKey) => rows.reduce((s, r) => s + r[key], 0)
  const prodTotal = sum(evaluations, 'production')
  const allTotal = environmentKeys.reduce((s, k) => s + sum(evaluations, k), 0)
  const firstWeek = sum(evaluations.slice(0, 7), 'production')
  const lastWeek = sum(evaluations.slice(-7), 'production')
  const weekTrend = relativeLift(firstWeek, lastWeek)
  const sortedByTrend = [...flagUsage].sort((a, b) => b.trend - a.trend)
  const top = [...flagUsage].sort((a, b) => b.evaluations - a.evaluations)[0]

  return {
    intent: 'analytics.summary',
    blocks: [
      {
        type: 'text',
        content: `Over the last 30 days FlagForge served ${formatCompact(totals.evaluations30d)} flag evaluations to ${formatCompact(totals.usersEvaluated)} users, with low latency and a very small error rate.`,
      },
      {
        type: 'metrics',
        items: [
          { label: 'Evaluations (30d)', value: formatCompact(totals.evaluations30d) },
          { label: 'Users evaluated', value: formatCompact(totals.usersEvaluated) },
          { label: 'Avg latency', value: `${totals.avgLatencyMs} ms`, tone: 'positive' },
          { label: 'Error rate', value: `${totals.errorRate}%`, tone: totals.errorRate < 0.1 ? 'positive' : 'caution' },
        ],
      },
      {
        type: 'trends',
        title: 'Flag usage (30d evaluations)',
        items: flagUsage.map((u) => ({ label: u.key, value: formatCompact(u.evaluations), trend: u.trend })),
      },
      {
        type: 'bullets',
        title: 'Key takeaways',
        items: [
          `Production accounts for ${((prodTotal / allTotal) * 100).toFixed(1)}% of charted evaluation volume.`,
          `Production evaluations in the latest week are ${signed(weekTrend)}% vs. the first week of the period.`,
          `${top.key} is the most-evaluated flag (${formatCompact(top.evaluations)}).`,
          `Fastest growing: ${sortedByTrend[0].key} (${signed(sortedByTrend[0].trend)}%). Steepest decline: ${sortedByTrend[sortedByTrend.length - 1].key} (${signed(sortedByTrend[sortedByTrend.length - 1].trend)}%).`,
        ],
      },
    ],
    sources: [SOURCES.analytics],
    followUps: ['Explain the ai-search-assistant flag', 'Identify rollout risks', 'Which experiment is performing best?'],
  }
}

function auditSummary(ctx: AssistantContext): AssistantResponse {
  const recent = ctx.audit.slice(0, 6)
  const prodChanges = ctx.audit.filter((e) => e.environment === 'production').length
  const actors = new Set(ctx.audit.map((e) => e.actor.name))
  return {
    intent: 'audit.summary',
    blocks: [
      {
        type: 'metrics',
        items: [
          { label: 'Logged events', value: String(ctx.audit.length) },
          { label: 'Production changes', value: String(prodChanges), tone: 'caution' },
          { label: 'Contributors', value: String(actors.size) },
        ],
      },
      {
        type: 'bullets',
        title: 'Most recent activity',
        items: recent.map(
          (e) => `${formatRelative(e.timestamp)} — ${e.actor.name} · ${e.resourceName}: ${e.details}${e.environment ? ` (${environmentLabels[e.environment]})` : ''}.`,
        ),
      },
    ],
    sources: [SOURCES.audit],
    followUps: ['Identify rollout risks', 'Who has admin access?'],
  }
}

function teamSummary(ctx: AssistantContext): AssistantResponse {
  const roles: Role[] = ['admin', 'developer', 'viewer']
  const active = ctx.team.filter((m) => m.status === 'active')
  const invited = ctx.team.filter((m) => m.status === 'invited')
  return {
    intent: 'team.summary',
    blocks: [
      {
        type: 'metrics',
        items: [
          ...roles.map((r) => ({
            label: `${r[0].toUpperCase()}${r.slice(1)}s`,
            value: String(active.filter((m) => m.role === r).length),
          })),
          { label: 'Pending invites', value: String(invited.length), tone: invited.length ? ('caution' as const) : ('neutral' as const) },
        ],
      },
      {
        type: 'bullets',
        title: 'Roles & permissions',
        items: roles.map((r) => {
          const people = ctx.team.filter((m) => m.role === r).map((m) => `${m.name}${m.status === 'invited' ? ' (invited)' : ''}`)
          return `${r[0].toUpperCase()}${r.slice(1)} — ${roleDescriptions[r]} ${people.length ? `Members: ${people.join(', ')}.` : 'No members.'}`
        }),
      },
    ],
    sources: [SOURCES.team],
    followUps: ['Show recent audit activity', 'Explain my Production flags'],
  }
}

function rulesSummary(ctx: AssistantContext): AssistantResponse {
  return {
    intent: 'rules.summary',
    blocks: [
      { type: 'text', content: `Your workspace has ${ctx.rules.length} targeting rules. Rules are evaluated before percentage rollout bucketing.` },
      ...ctx.rules.map<ResponseBlock>((rule) => {
        const usedBy = ctx.flags
          .flatMap((f) => environmentKeys.filter((env) => f.environments[env].ruleIds.includes(rule.id)).map((env) => `${f.key} (${environmentLabels[env]})`))
        return {
          type: 'bullets',
          title: rule.name,
          items: [
            `${rule.description}`,
            `Matches when ${rule.conditions.map((c) => `${c.attribute} ${operatorLabels[c.operator]} “${c.value}”`).join(` ${rule.combinator} `)}.`,
            `Used by: ${usedBy.length ? usedBy.join(', ') : 'no flags'}.`,
          ],
        }
      }),
    ],
    sources: [SOURCES.rules, SOURCES.flags],
    followUps: ['Explain my Production flags', 'What is a percentage rollout?'],
  }
}

function environmentsSummary(ctx: AssistantContext): AssistantResponse {
  return {
    intent: 'environments.summary',
    blocks: [
      {
        type: 'metrics',
        items: ctx.environments.map((env) => ({
          label: env.name,
          value: `${ctx.flags.filter((f) => f.environments[env.key].enabled).length} on`,
          hint: env.requireApproval ? 'requires confirmation' : 'no approval',
        })),
      },
      {
        type: 'bullets',
        items: ctx.environments.map((env) => `${env.name} — ${env.description} Default rollout ${env.defaultRollout}%.`),
      },
    ],
    sources: [SOURCES.environments, SOURCES.flags],
    followUps: ['Explain my Production flags', 'Explain my Staging flags'],
  }
}

function flagsOverview(ctx: AssistantContext): AssistantResponse {
  const boolean = ctx.flags.filter((f) => f.type === 'boolean').length
  return {
    intent: 'flags.overview',
    blocks: [
      {
        type: 'metrics',
        items: [
          { label: 'Total flags', value: String(ctx.flags.length) },
          { label: 'Boolean', value: String(boolean) },
          { label: 'Multivariate', value: String(ctx.flags.length - boolean) },
        ],
      },
      {
        type: 'bullets',
        title: 'Enabled per environment',
        items: environmentKeys.map((env) => {
          const on = ctx.flags.filter((f) => f.environments[env].enabled)
          return `${environmentLabels[env]}: ${on.length} of ${ctx.flags.length} enabled.`
        }),
      },
    ],
    sources: [SOURCES.flags],
    followUps: ['Explain my Production flags', 'Identify rollout risks', 'What is a multivariate flag?'],
  }
}

function readOnlyResponse(): AssistantResponse {
  return {
    intent: 'action.refused',
    blocks: [
      {
        type: 'recommendation',
        title: 'Read-only assistant',
        content:
          "I can't make changes. FlagForge Intelligence is advisory only — it never enables or disables flags, changes rollouts, edits targeting rules, modifies experiments or updates member roles. You can make that change yourself from the relevant page; Production changes require confirmation and are recorded in the audit log.",
      },
    ],
    sources: [],
    followUps: ['Identify rollout risks', 'Should I increase new-checkout-flow to 70%?'],
  }
}

function greetingResponse(): AssistantResponse {
  return {
    intent: 'greeting',
    blocks: [{ type: 'text', content: 'Hi! Ask me about your feature flags, experiments, rollout risks or platform analytics.' }],
    sources: [],
    followUps: ['Analyze my running experiments', 'Explain my Production flags', 'Summarize my platform analytics'],
  }
}

function unknownResponse(): AssistantResponse {
  return {
    intent: 'unknown',
    blocks: [{ type: 'text', content: UNKNOWN_ANSWER }],
    sources: [],
    followUps: ['Which experiment is performing best?', 'Explain my Production flags', 'Summarize my platform analytics'],
  }
}

/* ---------- Router ---------- */

const ACTION_VERBS =
  'enable|disable|turn (?:on|off)|toggle|set|change|update|increase|decrease|raise|lower|ramp|bump|delete|remove|pause|resume|start|stop|promote|demote|invite|edit|modify|create|archive'
const IMPERATIVE = new RegExp(`^(?:please\\s+)?(?:${ACTION_VERBS})\\b`)
const REQUEST = new RegExp(`\\b(?:can|could|would|will) you (?:please )?(?:${ACTION_VERBS})\\b`)
const ADVISORY = /\b(should|safe|ready|ok to|okay to|what if|recommend|advise|would it be|is it wise|can i)\b/
const INCREASE = /\b(increase|raise|bump|expand|ramp|roll ?out|go to|move to|scale|grow)\b/

export function generateResponse(rawQuery: string, ctx: AssistantContext): AssistantResponse {
  const q = rawQuery.toLowerCase().replace(/\s+/g, ' ').trim()
  const flag = findFlag(q, ctx.flags)
  const experiment = findExperiment(q, ctx.experiments)
  const env = findEnvironment(q)

  if (/^(hi|hello|hey|thanks|thank you|good (morning|afternoon|evening))\b/.test(q) && q.split(' ').length <= 4) {
    return greetingResponse()
  }

  if ((IMPERATIVE.test(q) || REQUEST.test(q)) && !ADVISORY.test(q)) return readOnlyResponse()

  if (ADVISORY.test(q) && (INCREASE.test(q) || findTargetPercent(q) !== undefined)) {
    const subject = flag ?? (experiment ? ctx.flags.find((f) => f.key === experiment.flagKey) : undefined)
    return subject ? rolloutAdvice(subject, findTargetPercent(q), ctx) : riskScan(ctx)
  }

  if (/\b(risks?|risky|dangers?|concerns?|issues?|problems?|alerts?|unsafe|safe)\b/.test(q) && !flag) return riskScan(ctx)

  if (!flag && !experiment && !(env && /flag/.test(q))) {
    const term = GLOSSARY.find((g) => g.pattern.test(q))
    if (term && /\b(what|explain|difference|mean|define|how)\b/.test(q)) {
      return {
        intent: 'glossary',
        blocks: [{ type: 'text', content: term.term }, ...term.build(ctx)],
        sources: [SOURCES.experiments, SOURCES.flags],
        followUps: ['Analyze the checkout experiment', 'Explain my Production flags'],
      }
    }
  }

  if (env && /\bflags?\b/.test(q) && !flag) return environmentFlags(env, ctx)

  if (experiment && /\b(experiment|test|analy[sz]|result|variant|conversion|lift|perform|winning|winner)/.test(q)) {
    return experimentAnalysis(experiment, ctx)
  }

  if (/\b(best|winning|winner|leading|top|performing|experiments?|a\/b|ab tests?)\b/.test(q)) {
    return experimentsOverview(ctx, /\b(best|winning|winner|leading|top|performing)\b/.test(q))
  }

  if (/\b(analytics|metrics?|evaluations?|latency|error rate|usage|traffic|platform|report)\b/.test(q)) {
    return analyticsSummary(ctx)
  }

  if (flag) return flagDetail(flag, ctx)
  if (experiment) return experimentAnalysis(experiment, ctx)

  if (/\b(audit|recent changes?|changed|history|activity|logs?)\b/.test(q)) return auditSummary(ctx)
  if (/\b(team|members?|roles?|permissions?|admins?|viewers?|developers?|access)\b/.test(q)) return teamSummary(ctx)
  if (/\b(rules?|targeting|segments?|audiences?)\b/.test(q)) return rulesSummary(ctx)
  if (/\b(environments?|approval)\b/.test(q) || env) return environmentsSummary(ctx)
  if (/\bflags?\b/.test(q)) return flagsOverview(ctx)

  return unknownResponse()
}
