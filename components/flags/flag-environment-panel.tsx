'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { FlagStatusBadge } from '@/components/app/badges'
import { SimpleSelect } from '@/components/app/simple-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { keys, revalidate } from '@/hooks/use-api'
import { flagsService } from '@/lib/api/services'
import { environmentLabels, operatorLabels } from '@/lib/format'
import type { EnvironmentKey, FeatureFlag, FlagEnvironmentConfig, TargetingRule } from '@/lib/types'

/** Editable per-environment config. Changes are staged locally and saved explicitly, except the kill switch. */
export function FlagEnvironmentPanel({
  flag,
  env,
  rules,
  draft,
  onDraftChange,
}: {
  flag: FeatureFlag
  env: EnvironmentKey
  rules: TargetingRule[]
  draft: FlagEnvironmentConfig
  onDraftChange: (next: FlagEnvironmentConfig) => void
}) {
  const saved = flag.environments[env]
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft)
  const variantOptions = flag.variants.map((v) => ({ value: v.id, label: `${v.name} (${v.value})` }))

  async function save(patch: Partial<FlagEnvironmentConfig>, message: string) {
    setSaving(true)
    try {
      await flagsService.updateEnvironment(flag.id, env, patch)
      await revalidate(keys.flag(flag.key), keys.flags)
      toast.success(message, { description: environmentLabels[env] })
    } catch (err) {
      toast.error('Could not save changes', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{environmentLabels[env]} configuration</CardTitle>
        <CardDescription>Rollout, targeting and variants served in this environment.</CardDescription>
        <CardAction>
          <FlagStatusBadge enabled={saved.enabled} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field orientation="horizontal" className="rounded-lg border bg-background/40 p-4">
            <FieldContent>
              <FieldLabel htmlFor={`kill-${env}`}>Flag enabled</FieldLabel>
              <FieldDescription>
                Acts as a kill switch. Turning it off immediately serves the fallback variant to everyone.
              </FieldDescription>
            </FieldContent>
            <Switch
              id={`kill-${env}`}
              checked={saved.enabled}
              disabled={saving}
              onCheckedChange={(enabled) => {
                onDraftChange({ ...draft, enabled })
                void save({ enabled }, enabled ? 'Flag enabled' : 'Flag disabled')
              }}
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor={`rollout-${env}`}>Percentage rollout</FieldLabel>
              <span className="font-mono text-2xl font-semibold tabular-nums" aria-live="polite">
                {draft.rollout}%
              </span>
            </div>
            <Slider
              id={`rollout-${env}`}
              value={[draft.rollout]}
              min={0}
              max={100}
              step={1}
              aria-label="Percentage rollout"
              onValueChange={(v) => onDraftChange({ ...draft, rollout: Array.isArray(v) ? v[0] : v })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>
                ~{draft.rollout} of every 100 users receive{' '}
                <span className="text-foreground">{flag.variants.find((v) => v.id === draft.servedVariantId)?.name}</span>
              </span>
              <span>100%</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[0, 10, 25, 50, 100].map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="xs"
                  variant={draft.rollout === preset ? 'secondary' : 'outline'}
                  onClick={() => onDraftChange({ ...draft, rollout: preset })}
                >
                  {preset}%
                </Button>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`served-${env}`}>Serve when targeted</FieldLabel>
              <SimpleSelect
                id={`served-${env}`}
                options={variantOptions}
                value={draft.servedVariantId}
                onValueChange={(servedVariantId) => onDraftChange({ ...draft, servedVariantId })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`fallback-${env}`}>Fallback variant</FieldLabel>
              <SimpleSelect
                id={`fallback-${env}`}
                options={variantOptions}
                value={draft.fallbackVariantId}
                onValueChange={(fallbackVariantId) => onDraftChange({ ...draft, fallbackVariantId })}
              />
            </Field>
          </div>

          <Separator />

          <FieldSet>
            <FieldLegend variant="label">User targeting</FieldLegend>
            <FieldDescription>
              Users matching any attached rule always receive the targeted variant, regardless of rollout.{' '}
              <Link href="/rules" className="text-primary underline-offset-4 hover:underline">
                Manage rules
              </Link>
            </FieldDescription>
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No targeting rules exist yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {rules.map((rule) => {
                  const checked = draft.ruleIds.includes(rule.id)
                  return (
                    <Field key={rule.id} orientation="horizontal" className="items-start rounded-lg border p-3">
                      <Checkbox
                        id={`${env}-${rule.id}`}
                        checked={checked}
                        onCheckedChange={(next) =>
                          onDraftChange({
                            ...draft,
                            ruleIds: next ? [...draft.ruleIds, rule.id] : draft.ruleIds.filter((id) => id !== rule.id),
                          })
                        }
                      />
                      <FieldContent>
                        <FieldLabel htmlFor={`${env}-${rule.id}`}>{rule.name}</FieldLabel>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {rule.conditions.map((c, i) => (
                            <span key={c.id} className="flex items-center gap-1.5">
                              {i > 0 ? (
                                <Badge variant="outline" className="h-4 px-1 font-mono text-[10px]">
                                  {rule.combinator}
                                </Badge>
                              ) : null}
                              <span>
                                <span className="font-mono text-foreground">{c.attribute}</span> {operatorLabels[c.operator]}{' '}
                                <span className="font-mono text-foreground">{c.value}</span>
                              </span>
                            </span>
                          ))}
                        </div>
                      </FieldContent>
                    </Field>
                  )
                })}
              </div>
            )}
          </FieldSet>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button variant="ghost" disabled={!dirty || saving} onClick={() => onDraftChange(saved)}>
          Discard
        </Button>
        <Button
          disabled={!dirty || saving}
          onClick={() =>
            void save(
              {
                rollout: draft.rollout,
                ruleIds: draft.ruleIds,
                servedVariantId: draft.servedVariantId,
                fallbackVariantId: draft.fallbackVariantId,
              },
              'Configuration saved',
            )
          }
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </CardFooter>
    </Card>
  )
}
