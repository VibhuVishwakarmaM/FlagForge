import {
  analyticsService,
  auditService,
  environmentsService,
  experimentsService,
  flagsService,
  rulesService,
  teamService,
} from '@/lib/api/services'
import { generateResponse } from './response-engine'
import type { AssistantContext, AssistantResponse } from './types'

/**
 * Demo assistant entry point. The UI only depends on `askAssistant`, so this
 * module can later be swapped for a call to a server route backed by Gemini
 * without touching the components. All data access here is read-only.
 */

async function loadContext(): Promise<AssistantContext> {
  const [flags, experiments, rules, analytics, audit, team, environments] = await Promise.all([
    flagsService.list(),
    experimentsService.list(),
    rulesService.list(),
    analyticsService.get(),
    auditService.list(),
    teamService.list(),
    environmentsService.list(),
  ])
  return { flags, experiments, rules, analytics, audit, team, environments }
}

export async function askAssistant(prompt: string): Promise<AssistantResponse> {
  const query = prompt.trim()
  if (!query) throw new Error('Please enter a question.')
  const [context] = await Promise.all([loadContext(), new Promise((resolve) => setTimeout(resolve, 500))])
  return generateResponse(query, context)
}

export const SUGGESTED_PROMPTS = [
  {
    id: 'experiments',
    title: 'Analyze Running Experiments',
    description: 'Compare variant conversion across live tests',
    prompt: 'Analyze my running experiments',
  },
  {
    id: 'production',
    title: 'Explain Production Flags',
    description: 'Rollouts, rules and served variants',
    prompt: 'Explain my Production flags',
  },
  {
    id: 'risks',
    title: 'Identify Rollout Risks',
    description: 'Scan for alerts, overlaps and recent ramps',
    prompt: 'Identify any rollout risks in Production',
  },
  {
    id: 'analytics',
    title: 'Summarize Platform Analytics',
    description: 'Evaluations, latency, errors and trends',
    prompt: 'Summarize my platform analytics',
  },
  {
    id: 'checkout',
    title: 'Explain New Checkout Flow',
    description: 'Configuration, experiment and history',
    prompt: 'Explain the new-checkout-flow flag',
  },
] as const
