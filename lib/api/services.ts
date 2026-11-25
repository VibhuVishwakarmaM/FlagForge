import { mockApi } from '@/lib/mock/adapter'
import type {
  AnalyticsSnapshot,
  AuditEvent,
  CreateExperimentInput,
  CreateFlagInput,
  CreateRuleInput,
  Environment,
  EnvironmentKey,
  Experiment,
  ExperimentStatus,
  FeatureFlag,
  FlagEnvironmentConfig,
  Role,
  SdkKey,
  TargetingRule,
  TeamMember,
  Workspace,
} from '@/lib/types'
import { http, isMockMode, json } from './client'

export const flagsService = {
  list: (): Promise<FeatureFlag[]> => (isMockMode ? mockApi.flags.list() : http('/flags')),
  get: (key: string): Promise<FeatureFlag> => (isMockMode ? mockApi.flags.get(key) : http(`/flags/${key}`)),
  create: (input: CreateFlagInput): Promise<FeatureFlag> =>
    isMockMode ? mockApi.flags.create(input) : http('/flags', { method: 'POST', body: json(input) }),
  update: (id: string, patch: Partial<Pick<FeatureFlag, 'name' | 'description' | 'tags' | 'variants'>>): Promise<FeatureFlag> =>
    isMockMode ? mockApi.flags.update(id, patch) : http(`/flags/${id}`, { method: 'PATCH', body: json(patch) }),
  updateEnvironment: (id: string, env: EnvironmentKey, patch: Partial<FlagEnvironmentConfig>): Promise<FeatureFlag> =>
    isMockMode
      ? mockApi.flags.updateEnvironment(id, env, patch)
      : http(`/flags/${id}/environments/${env}`, { method: 'PATCH', body: json(patch) }),
  remove: (id: string): Promise<void> =>
    isMockMode ? mockApi.flags.remove(id) : http(`/flags/${id}`, { method: 'DELETE' }),
}

export const experimentsService = {
  list: (): Promise<Experiment[]> => (isMockMode ? mockApi.experiments.list() : http('/experiments')),
  create: (input: CreateExperimentInput): Promise<Experiment> =>
    isMockMode ? mockApi.experiments.create(input) : http('/experiments', { method: 'POST', body: json(input) }),
  setStatus: (id: string, status: ExperimentStatus): Promise<Experiment> =>
    isMockMode
      ? mockApi.experiments.setStatus(id, status)
      : http(`/experiments/${id}/status`, { method: 'PATCH', body: json({ status }) }),
  remove: (id: string): Promise<void> =>
    isMockMode ? mockApi.experiments.remove(id) : http(`/experiments/${id}`, { method: 'DELETE' }),
}

export const rulesService = {
  list: (): Promise<TargetingRule[]> => (isMockMode ? mockApi.rules.list() : http('/rules')),
  create: (input: CreateRuleInput): Promise<TargetingRule> =>
    isMockMode ? mockApi.rules.create(input) : http('/rules', { method: 'POST', body: json(input) }),
  update: (id: string, input: CreateRuleInput): Promise<TargetingRule> =>
    isMockMode ? mockApi.rules.update(id, input) : http(`/rules/${id}`, { method: 'PUT', body: json(input) }),
  remove: (id: string): Promise<void> =>
    isMockMode ? mockApi.rules.remove(id) : http(`/rules/${id}`, { method: 'DELETE' }),
}

export const teamService = {
  list: (): Promise<TeamMember[]> => (isMockMode ? mockApi.team.list() : http('/team')),
  invite: (input: { name: string; email: string; role: Role }): Promise<TeamMember> =>
    isMockMode ? mockApi.team.invite(input) : http('/team/invitations', { method: 'POST', body: json(input) }),
  updateRole: (id: string, role: Role): Promise<TeamMember> =>
    isMockMode ? mockApi.team.updateRole(id, role) : http(`/team/${id}`, { method: 'PATCH', body: json({ role }) }),
  remove: (id: string): Promise<void> =>
    isMockMode ? mockApi.team.remove(id) : http(`/team/${id}`, { method: 'DELETE' }),
}

export const auditService = {
  list: (): Promise<AuditEvent[]> => (isMockMode ? mockApi.audit.list() : http('/audit-logs')),
}

export const environmentsService = {
  list: (): Promise<Environment[]> => (isMockMode ? mockApi.environments.list() : http('/environments')),
}

export const analyticsService = {
  get: (): Promise<AnalyticsSnapshot> => (isMockMode ? mockApi.analytics.get() : http('/analytics')),
}

export const settingsService = {
  getWorkspace: (): Promise<Workspace> => (isMockMode ? mockApi.settings.getWorkspace() : http('/workspace')),
  updateWorkspace: (patch: Partial<Workspace>): Promise<Workspace> =>
    isMockMode ? mockApi.settings.updateWorkspace(patch) : http('/workspace', { method: 'PATCH', body: json(patch) }),
  listSdkKeys: (): Promise<SdkKey[]> => (isMockMode ? mockApi.settings.listSdkKeys() : http('/sdk-keys')),
  createSdkKey: (input: Pick<SdkKey, 'name' | 'environment' | 'type'>): Promise<SdkKey> =>
    isMockMode ? mockApi.settings.createSdkKey(input) : http('/sdk-keys', { method: 'POST', body: json(input) }),
  revokeSdkKey: (id: string): Promise<void> =>
    isMockMode ? mockApi.settings.revokeSdkKey(id) : http(`/sdk-keys/${id}`, { method: 'DELETE' }),
}
