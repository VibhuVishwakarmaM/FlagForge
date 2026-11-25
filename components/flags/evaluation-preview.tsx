'use client'

import { useState } from 'react'
import { CheckCircle2, CircleSlash, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { evaluateFlag, reasonLabels } from '@/lib/evaluation'
import type { EnvironmentKey, FeatureFlag, FlagEnvironmentConfig, TargetingRule } from '@/lib/types'
import { cn } from '@/lib/utils'

const initialAttributes = [
  { name: 'email', value: 'dana@acme.io' },
  { name: 'country', value: 'US' },
  { name: 'plan', value: 'pro' },
]

/** Runs the shared evaluation logic against the draft config so users can preview before saving. */
export function EvaluationPreview({
  flag,
  env,
  config,
  rules,
}: {
  flag: FeatureFlag
  env: EnvironmentKey
  config: FlagEnvironmentConfig
  rules: TargetingRule[]
}) {
  const [userKey, setUserKey] = useState('user-4821')
  const [attributes, setAttributes] = useState(initialAttributes)

  const draftFlag: FeatureFlag = { ...flag, environments: { ...flag.environments, [env]: config } }
  const result = evaluateFlag(
    draftFlag,
    env,
    { key: userKey.trim(), attributes: Object.fromEntries(attributes.filter((a) => a.name.trim()).map((a) => [a.name.trim(), a.value])) },
    rules,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation preview</CardTitle>
        <CardDescription>See what a user would receive with the current (unsaved) configuration.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="eval-user-key">User key</FieldLabel>
            <Input id="eval-user-key" value={userKey} onChange={(e) => setUserKey(e.target.value)} className="font-mono" />
          </Field>
          <FieldSet>
            <FieldLegend variant="label">Attributes</FieldLegend>
            <div className="flex flex-col gap-2">
              {attributes.map((attr, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    aria-label={`Attribute ${i + 1} name`}
                    value={attr.name}
                    placeholder="attribute"
                    className="font-mono"
                    onChange={(e) => setAttributes((prev) => prev.map((a, j) => (j === i ? { ...a, name: e.target.value } : a)))}
                  />
                  <Input
                    aria-label={`Attribute ${i + 1} value`}
                    value={attr.value}
                    placeholder="value"
                    onChange={(e) => setAttributes((prev) => prev.map((a, j) => (j === i ? { ...a, value: e.target.value } : a)))}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove attribute ${i + 1}`}
                    onClick={() => setAttributes((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="self-start" onClick={() => setAttributes((prev) => [...prev, { name: '', value: '' }])}>
              <Plus data-icon="inline-start" />
              Add attribute
            </Button>
          </FieldSet>
        </FieldGroup>

        <Separator />

        <div
          className={cn(
            'flex flex-col gap-3 rounded-lg border p-4',
            result.reason === 'RULE_MATCH' || result.reason === 'ROLLOUT' ? 'border-success/30 bg-success/5' : 'bg-muted/40',
          )}
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {result.reason === 'RULE_MATCH' || result.reason === 'ROLLOUT' ? (
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
            ) : (
              <CircleSlash className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
            <p className="text-sm font-medium">Serves</p>
            <Badge variant="secondary" className="font-mono">
              {result.variant ? result.variant.value : 'null'}
            </Badge>
            <span className="text-sm text-muted-foreground">({result.variant?.name ?? 'none'})</span>
          </div>
          <p className="text-sm text-muted-foreground">{reasonLabels[result.reason]}</p>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="font-mono">{result.reason}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">Bucket</dt>
              <dd className="font-mono">
                {result.bucket} / 100 {result.bucket < config.rollout ? '(in rollout)' : '(outside rollout)'}
              </dd>
            </div>
            {result.matchedRule ? (
              <div className="col-span-2 flex flex-col gap-0.5">
                <dt className="text-muted-foreground">Matched rule</dt>
                <dd>{result.matchedRule.name}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </CardContent>
    </Card>
  )
}
