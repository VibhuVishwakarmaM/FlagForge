'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { SimpleSelect } from '@/components/app/simple-select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { keys, revalidate, useFlags } from '@/hooks/use-api'
import { experimentsService } from '@/lib/api/services'
import { environmentKeys, environmentLabels } from '@/lib/format'
import type { EnvironmentKey } from '@/lib/types'

const metricOptions = ['checkout_completed', 'plan_upgraded', 'signup_completed', 'session_length', 'search_clicked'].map((m) => ({
  value: m,
  label: m,
}))

type Errors = Partial<Record<'name' | 'flagKey' | 'variants', string>>

export function ExperimentFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {open ? <ExperimentForm onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ExperimentForm({ onDone }: { onDone: () => void }) {
  const { data: flags } = useFlags()
  const [name, setName] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [flagKey, setFlagKey] = useState<string | null>(null)
  const [environment, setEnvironment] = useState<EnvironmentKey>('production')
  const [traffic, setTraffic] = useState(50)
  const [metric, setMetric] = useState('checkout_completed')
  const [variants, setVariants] = useState([
    { name: 'Control', allocation: 50 },
    { name: 'Treatment', allocation: 50 },
  ])
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const totalAllocation = variants.reduce((sum, v) => sum + v.allocation, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Errors = {}
    if (name.trim().length < 3) next.name = 'Name must be at least 3 characters.'
    if (!flagKey) next.flagKey = 'Choose the flag this experiment runs on.'
    if (variants.some((v) => !v.name.trim())) next.variants = 'Every variant needs a name.'
    else if (totalAllocation !== 100) next.variants = `Allocations must add up to 100% (currently ${totalAllocation}%).`
    setErrors(next)
    if (Object.keys(next).length || !flagKey) return

    setSubmitting(true)
    try {
      await experimentsService.create({
        name: name.trim(),
        hypothesis: hypothesis.trim(),
        flagKey,
        environment,
        trafficPercentage: traffic,
        primaryMetric: metric,
        variants: variants.map((v) => ({ name: v.name.trim(), allocation: v.allocation })),
      })
      await revalidate(keys.experiments)
      toast.success('Experiment created', { description: 'Saved as a draft. Start it when you are ready.' })
      onDone()
    } catch (err) {
      toast.error('Could not create experiment', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>New experiment</DialogTitle>
        <DialogDescription>Split traffic between variants and measure the impact on a metric.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="exp-name">Name</FieldLabel>
          <Input id="exp-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-invalid={errors.name ? true : undefined} placeholder="Checkout CTA copy" />
          {errors.name ? <FieldError>{errors.name}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="exp-hypothesis">Hypothesis</FieldLabel>
          <Textarea id="exp-hypothesis" rows={2} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="Changing X will increase Y because…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errors.flagKey ? true : undefined}>
            <FieldLabel htmlFor="exp-flag">Flag</FieldLabel>
            <SimpleSelect
              id="exp-flag"
              placeholder="Select a flag"
              invalid={Boolean(errors.flagKey)}
              options={(flags ?? []).map((f) => ({ value: f.key, label: f.name }))}
              value={flagKey}
              onValueChange={setFlagKey}
            />
            {errors.flagKey ? <FieldError>{errors.flagKey}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="exp-env">Environment</FieldLabel>
            <SimpleSelect
              id="exp-env"
              options={environmentKeys.map((k) => ({ value: k, label: environmentLabels[k] }))}
              value={environment}
              onValueChange={setEnvironment}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="exp-metric">Primary metric</FieldLabel>
          <SimpleSelect id="exp-metric" options={metricOptions} value={metric} onValueChange={setMetric} />
        </Field>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="exp-traffic">Traffic in experiment</FieldLabel>
            <span className="font-mono text-sm tabular-nums">{traffic}%</span>
          </div>
          <Slider id="exp-traffic" value={[traffic]} min={1} max={100} aria-label="Traffic in experiment" onValueChange={(v) => setTraffic(Array.isArray(v) ? v[0] : v)} />
          <FieldDescription>Share of eligible users enrolled. The rest get the default experience.</FieldDescription>
        </Field>
        <FieldSet data-invalid={errors.variants ? true : undefined}>
          <FieldLegend variant="label">Variants &amp; allocation</FieldLegend>
          <div className="flex flex-col gap-2">
            {variants.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  aria-label={`Variant ${i + 1} name`}
                  value={v.name}
                  onChange={(e) => setVariants((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                />
                <Input
                  aria-label={`Variant ${i + 1} allocation percent`}
                  type="number"
                  min={0}
                  max={100}
                  className="w-24 font-mono"
                  value={v.allocation}
                  onChange={(e) =>
                    setVariants((prev) => prev.map((x, j) => (j === i ? { ...x, allocation: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } : x)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove variant ${i + 1}`}
                  disabled={variants.length <= 2}
                  onClick={() => setVariants((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={variants.length >= 5}
              onClick={() => setVariants((prev) => [...prev, { name: `Variant ${String.fromCharCode(65 + prev.length - 1)}`, allocation: 0 }])}
            >
              <Plus data-icon="inline-start" />
              Add variant
            </Button>
            <span className="font-mono text-xs text-muted-foreground">Total {totalAllocation}%</span>
          </div>
          {errors.variants ? <FieldError>{errors.variants}</FieldError> : null}
        </FieldSet>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create experiment'}
        </Button>
      </DialogFooter>
    </form>
  )
}
