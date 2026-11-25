import type {
  AuditAction,
  AuditEvent,
  CreateExperimentInput,
  CreateFlagInput,
  CreateRuleInput,
  EnvironmentKey,
  Experiment,
  ExperimentStatus,
  FeatureFlag,
  FlagEnvironmentConfig,
  ResourceType,
  Role,
  SdkKey,
  TargetingRule,
  TeamMember,
  Workspace,
} from '@/lib/types'
import {
  seedAnalytics,
  seedAudit,
  seedEnvironments,
  seedExperiments,
  seedFlags,
  seedRules,
  seedSdkKeys,
  seedTeam,
  seedWorkspace,
} from './data'

const db = {
  flags: structuredClone(seedFlags),
  experiments: structuredClone(seedExperiments),
  rules: structuredClone(seedRules),
  team: structuredClone(seedTeam),
  audit: structuredClone(seedAudit),
  sdkKeys: structuredClone(seedSdkKeys),
  workspace: structuredClone(seedWorkspace),
  environments: structuredClone(seedEnvironments),
}

const MOCK_ACTOR = { name: 'Demo user', email: 'demo@local.mock' }

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 200))
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`
const now = () => new Date().toISOString()
const clone = <T>(value: T): T => structuredClone(value)

class MockApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

function record(
  action: AuditAction,
  resourceType: ResourceType,
  resourceName: string,
  details: string,
  environment?: EnvironmentKey,
) {
  const event: AuditEvent = {
    id: uid('evt'),
    actor: MOCK_ACTOR,
    action,
    resourceType,
    resourceName,
    details,
    environment,
    timestamp: now(),
  }
  db.audit.unshift(event)
}

function findFlag(id: string) {
  const flag = db.flags.find((f) => f.id === id || f.key === id)
  if (!flag) throw new MockApiError('Flag not found', 404)
  return flag
}

export const mockApi = {
  flags: {
    async list() {
      await delay()
      return clone(db.flags)
    },
    async get(idOrKey: string) {
      await delay(250)
      return clone(findFlag(idOrKey))
    },
    async create(input: CreateFlagInput) {
      await delay()
      if (db.flags.some((f) => f.key === input.key)) {
        throw new MockApiError(`A flag with key "${input.key}" already exists`, 409)
      }
      const variants = input.variants.map((v, i) => ({ ...v, id: `${v.value || 'v'}-${i}`.toLowerCase() }))
      const served = variants[0].id
      const fallback = variants[variants.length - 1].id
      const base = (rollout: number): FlagEnvironmentConfig => ({
        enabled: false,
        rollout,
        ruleIds: [],
        servedVariantId: served,
        fallbackVariantId: fallback,
      })
      const flag: FeatureFlag = {
        id: uid('flg'),
        key: input.key,
        name: input.name,
        description: input.description,
        type: input.type,
        tags: input.tags,
        owner: MOCK_ACTOR.name,
        variants,
        environments: { development: base(100), staging: base(50), production: base(0) },
        createdAt: now(),
        updatedAt: now(),
      }
      db.flags.unshift(flag)
      record('flag.created', 'flag', flag.key, `${input.type} flag created with ${variants.length} variants`)
      return clone(flag)
    },
    async update(id: string, patch: Partial<Pick<FeatureFlag, 'name' | 'description' | 'tags' | 'variants'>>) {
      await delay()
      const flag = findFlag(id)
      Object.assign(flag, patch, { updatedAt: now() })
      record('flag.updated', 'flag', flag.key, `Updated ${Object.keys(patch).join(', ')}`)
      return clone(flag)
    },
    async updateEnvironment(id: string, env: EnvironmentKey, patch: Partial<FlagEnvironmentConfig>) {
      await delay(250)
      const flag = findFlag(id)
      const prev = flag.environments[env]
      flag.environments[env] = { ...prev, ...patch }
      flag.updatedAt = now()
      if (patch.enabled !== undefined && patch.enabled !== prev.enabled) {
        record('flag.toggled', 'flag', flag.key, `Flag ${patch.enabled ? 'enabled' : 'disabled'}`, env)
      }
      if (patch.rollout !== undefined && patch.rollout !== prev.rollout) {
        record('flag.rollout_changed', 'flag', flag.key, `Rollout changed from ${prev.rollout}% to ${patch.rollout}%`, env)
      }
      if (patch.ruleIds || patch.servedVariantId || patch.fallbackVariantId) {
        record('flag.updated', 'flag', flag.key, 'Targeting configuration updated', env)
      }
      return clone(flag)
    },
    async remove(id: string) {
      await delay()
      const flag = findFlag(id)
      db.flags = db.flags.filter((f) => f.id !== flag.id)
      record('flag.deleted', 'flag', flag.key, 'Flag deleted')
    },
  },
  experiments: {
    async list() {
      await delay()
      return clone(db.experiments)
    },
    async create(input: CreateExperimentInput) {
      await delay()
      const experiment: Experiment = {
        id: uid('exp'),
        ...input,
        status: 'draft',
        variants: input.variants.map((v, i) => ({ ...v, id: `v${i}`, exposures: 0, conversions: 0 })),
        dailyConversion: [],
        createdAt: now(),
      }
      db.experiments.unshift(experiment)
      record('experiment.created', 'experiment', experiment.name, `Experiment created with ${input.variants.length} variants`, input.environment)
      return clone(experiment)
    },
    async setStatus(id: string, status: ExperimentStatus) {
      await delay(250)
      const experiment = db.experiments.find((e) => e.id === id)
      if (!experiment) throw new MockApiError('Experiment not found', 404)
      experiment.status = status
      if (status === 'running' && !experiment.startedAt) experiment.startedAt = now()
      record('experiment.status_changed', 'experiment', experiment.name, `Status changed to ${status}`, experiment.environment)
      return clone(experiment)
    },
    async remove(id: string) {
      await delay()
      const experiment = db.experiments.find((e) => e.id === id)
      if (!experiment) throw new MockApiError('Experiment not found', 404)
      db.experiments = db.experiments.filter((e) => e.id !== id)
      record('experiment.deleted', 'experiment', experiment.name, 'Experiment deleted')
    },
  },
  rules: {
    async list() {
      await delay()
      return clone(db.rules)
    },
    async create(input: CreateRuleInput) {
      await delay()
      const rule: TargetingRule = {
        id: uid('rule'),
        ...input,
        conditions: input.conditions.map((c) => ({ ...c, id: uid('c') })),
        createdAt: now(),
        updatedAt: now(),
      }
      db.rules.unshift(rule)
      record('rule.created', 'rule', rule.name, `${rule.conditions.length} conditions joined by ${rule.combinator}`)
      return clone(rule)
    },
    async update(id: string, input: CreateRuleInput) {
      await delay()
      const rule = db.rules.find((r) => r.id === id)
      if (!rule) throw new MockApiError('Rule not found', 404)
      Object.assign(rule, input, {
        conditions: input.conditions.map((c) => ({ ...c, id: uid('c') })),
        updatedAt: now(),
      })
      record('rule.updated', 'rule', rule.name, `${rule.conditions.length} conditions joined by ${rule.combinator}`)
      return clone(rule)
    },
    async remove(id: string) {
      await delay()
      const rule = db.rules.find((r) => r.id === id)
      if (!rule) throw new MockApiError('Rule not found', 404)
      db.rules = db.rules.filter((r) => r.id !== id)
      db.flags.forEach((flag) => {
        Object.values(flag.environments).forEach((cfg) => {
          cfg.ruleIds = cfg.ruleIds.filter((r) => r !== id)
        })
      })
      record('rule.deleted', 'rule', rule.name, 'Rule deleted and detached from flags')
    },
  },
  team: {
    async list() {
      await delay()
      return clone(db.team)
    },
    async invite(input: { name: string; email: string; role: Role }) {
      await delay()
      if (db.team.some((m) => m.email.toLowerCase() === input.email.toLowerCase())) {
        throw new MockApiError('This email is already a member', 409)
      }
      const member: TeamMember = { id: uid('usr'), ...input, status: 'invited', lastActiveAt: null }
      db.team.push(member)
      record('member.invited', 'member', input.email, `Invited as ${input.role}`)
      return clone(member)
    },
    async updateRole(id: string, role: Role) {
      await delay(250)
      const member = db.team.find((m) => m.id === id)
      if (!member) throw new MockApiError('Member not found', 404)
      if (member.role === 'admin' && role !== 'admin' && db.team.filter((m) => m.role === 'admin').length === 1) {
        throw new MockApiError('A workspace must keep at least one admin', 422)
      }
      const prev = member.role
      member.role = role
      record('member.role_changed', 'member', member.email, `Role changed from ${prev} to ${role}`)
      return clone(member)
    },
    async remove(id: string) {
      await delay()
      const member = db.team.find((m) => m.id === id)
      if (!member) throw new MockApiError('Member not found', 404)
      if (member.role === 'admin' && db.team.filter((m) => m.role === 'admin').length === 1) {
        throw new MockApiError('A workspace must keep at least one admin', 422)
      }
      db.team = db.team.filter((m) => m.id !== id)
      record('member.removed', 'member', member.email, 'Member removed from workspace')
    },
  },
  audit: {
    async list() {
      await delay()
      return clone(db.audit)
    },
  },
  environments: {
    async list() {
      await delay(200)
      return clone(db.environments)
    },
  },
  analytics: {
    async get() {
      await delay(450)
      return clone(seedAnalytics)
    },
  },
  settings: {
    async getWorkspace() {
      await delay(200)
      return clone(db.workspace)
    },
    async updateWorkspace(patch: Partial<Workspace>) {
      await delay()
      Object.assign(db.workspace, patch)
      record('workspace.updated', 'workspace', db.workspace.name, `Updated ${Object.keys(patch).join(', ')}`)
      return clone(db.workspace)
    },
    async listSdkKeys() {
      await delay()
      return clone(db.sdkKeys)
    },
    async createSdkKey(input: Pick<SdkKey, 'name' | 'environment' | 'type'>) {
      await delay()
      const key: SdkKey = {
        id: uid('key'),
        ...input,
        lastFour: Math.random().toString(16).slice(2, 6),
        createdAt: now(),
        lastUsedAt: null,
      }
      db.sdkKeys.unshift(key)
      record('sdk_key.created', 'sdk_key', key.name, `${input.type} SDK key created`, input.environment)
      return clone(key)
    },
    async revokeSdkKey(id: string) {
      await delay()
      const key = db.sdkKeys.find((k) => k.id === id)
      if (!key) throw new MockApiError('Key not found', 404)
      db.sdkKeys = db.sdkKeys.filter((k) => k.id !== id)
      record('sdk_key.revoked', 'sdk_key', key.name, 'SDK key revoked', key.environment)
    },
  },
}
