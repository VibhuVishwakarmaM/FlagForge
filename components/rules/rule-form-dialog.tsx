'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { SimpleSelect } from '@/components/app/simple-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { keys, revalidate } from '@/hooks/use-api'
import { rulesService } from '@/lib/api/services'
import { operatorLabels } from '@/lib/format'
import type { RuleCombinator, RuleOperator, TargetingRule } from '@/lib/types'

const attributeSuggestions = ['email', 'country', 'plan', 'userId', 'accountAge', 'platform', 'appVersion']
const operatorOptions = (Object.keys(operatorLabels) as RuleOperator[]).map((op) => ({ value: op, label: operatorLabels[op] }))

interface ConditionDraft {
  attribute: string
  operator: RuleOperator
  value: string
}

export function RuleFormDialog({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: TargetingRule
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {open ? <RuleForm key={rule?.id ?? 'new'} rule={rule} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function RuleForm({ rule, onDone }: { rule?: TargetingRule; onDone: () => void }) {
  const [name, setName] = useState(rule?.name ?? '')
  const [description, setDescription] = useState(rule?.description ?? '')
  const [combinator, setCombinator] = useState<RuleCombinator>(rule?.combinator ?? 'AND')
  const [conditions, setConditions] = useState<ConditionDraft[]>(
    rule?.conditions.map(({ attribute, operator, value }) => ({ attribute, operator, value })) ?? [
      { attribute: 'country', operator: 'equals', value: '' },
    ],
  )
  const [errors, setErrors] = useState<{ name?: string; conditions?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const update = (i: number, patch: Partial<ConditionDraft>) =>
    setConditions((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (name.trim().length < 3) next.name = 'Name must be at least 3 characters.'
    if (conditions.length === 0) next.conditions = 'Add at least one condition.'
    else if (conditions.some((c) => !c.attribute.trim() || !c.value.trim())) next.conditions = 'Every condition needs an attribute and value.'
    else if (conditions.some((c) => (c.operator === 'greater_than' || c.operator === 'less_than') && Number.isNaN(Number(c.value))))
      next.conditions = 'Numeric comparisons require a number value.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    const input = {
      name: name.trim(),
      description: description.trim(),
      combinator,
      conditions: conditions.map((c) => ({ ...c, attribute: c.attribute.trim(), value: c.value.trim() })),
    }
    try {
      if (rule) await rulesService.update(rule.id, input)
      else await rulesService.create(input)
      await revalidate(keys.rules)
      toast.success(rule ? 'Rule updated' : 'Rule created', { description: input.name })
      onDone()
    } catch (err) {
      toast.error('Could not save rule', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{rule ? 'Edit targeting rule' : 'New targeting rule'}</DialogTitle>
        <DialogDescription>Reusable segments you can attach to any flag in any environment.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="rule-name">Name</FieldLabel>
          <Input id="rule-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-invalid={errors.name ? true : undefined} placeholder="Beta testers in EU" />
          {errors.name ? <FieldError>{errors.name}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="rule-description">Description</FieldLabel>
          <Textarea id="rule-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <FieldSet data-invalid={errors.conditions ? true : undefined}>
          <div className="flex items-center justify-between gap-2">
            <FieldLegend variant="label">Conditions</FieldLegend>
            <ToggleGroup value={[combinator]} onValueChange={(v) => v[0] && setCombinator(v[0] as RuleCombinator)} variant="outline" size="sm" aria-label="Match condition">
              <ToggleGroupItem value="AND">Match all</ToggleGroupItem>
              <ToggleGroupItem value="OR">Match any</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <FieldDescription>
            For <span className="font-mono">is one of</span>, separate values with commas.
          </FieldDescription>
          <datalist id="rule-attributes">
            {attributeSuggestions.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
          <div className="flex flex-col gap-2">
            {conditions.map((c, i) => (
              <div key={i} className="flex flex-col gap-2">
                {i > 0 ? (
                  <Badge variant="outline" className="self-start font-mono text-[10px]">
                    {combinator}
                  </Badge>
                ) : null}
                <div className="flex flex-col gap-2 rounded-lg border bg-background/40 p-2 sm:flex-row sm:items-center">
                  <Input
                    aria-label={`Condition ${i + 1} attribute`}
                    list="rule-attributes"
                    className="font-mono sm:w-36"
                    value={c.attribute}
                    placeholder="attribute"
                    onChange={(e) => update(i, { attribute: e.target.value })}
                  />
                  <SimpleSelect
                    aria-label={`Condition ${i + 1} operator`}
                    className="sm:w-44"
                    options={operatorOptions}
                    value={c.operator}
                    onValueChange={(operator) => update(i, { operator })}
                  />
                  <Input
                    aria-label={`Condition ${i + 1} value`}
                    className="flex-1"
                    value={c.value}
                    placeholder={c.operator === 'in' ? 'US, CA, GB' : 'value'}
                    onChange={(e) => update(i, { value: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove condition ${i + 1}`}
                    disabled={conditions.length <= 1}
                    onClick={() => setConditions((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setConditions((prev) => [...prev, { attribute: '', operator: 'equals', value: '' }])}
          >
            <Plus data-icon="inline-start" />
            Add condition
          </Button>
          {errors.conditions ? <FieldError>{errors.conditions}</FieldError> : null}
        </FieldSet>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : rule ? 'Save rule' : 'Create rule'}
        </Button>
      </DialogFooter>
    </form>
  )
}
