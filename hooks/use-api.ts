'use client'

import useSWR, { mutate } from 'swr'
import {
  analyticsService,
  auditService,
  environmentsService,
  experimentsService,
  flagsService,
  rulesService,
  settingsService,
  teamService,
} from '@/lib/api/services'

export const keys = {
  flags: 'flags',
  flag: (key: string) => ['flag', key] as const,
  experiments: 'experiments',
  rules: 'rules',
  team: 'team',
  audit: 'audit',
  environments: 'environments',
  analytics: 'analytics',
  workspace: 'workspace',
  sdkKeys: 'sdk-keys',
}

export const useFlags = () => useSWR(keys.flags, flagsService.list)
export const useFlag = (key: string) => useSWR(keys.flag(key), () => flagsService.get(key))
export const useExperiments = () => useSWR(keys.experiments, experimentsService.list)
export const useRules = () => useSWR(keys.rules, rulesService.list)
export const useTeam = () => useSWR(keys.team, teamService.list)
export const useAuditLogs = () => useSWR(keys.audit, auditService.list)
export const useEnvironments = () => useSWR(keys.environments, environmentsService.list)
export const useAnalytics = () => useSWR(keys.analytics, analyticsService.get)
export const useWorkspace = () => useSWR(keys.workspace, settingsService.getWorkspace)
export const useSdkKeys = () => useSWR(keys.sdkKeys, settingsService.listSdkKeys)

/** Revalidate the given cache keys plus the audit log, which every mutation appends to. */
export async function revalidate(...cacheKeys: Array<string | readonly unknown[]>) {
  await Promise.all([
    ...cacheKeys.map((k) =>
      Array.isArray(k)
        ? mutate((existing) => Array.isArray(existing) && existing[0] === k[0])
        : mutate(k),
    ),
    mutate(keys.audit),
  ])
}
