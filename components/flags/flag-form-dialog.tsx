'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { keys, revalidate } from '@/hooks/use-api'
import { flagsService } from '@/lib/api/services'
import { slugify } from '@/lib/format'
import type { FeatureFlag, FlagType } from '@/lib/types'

interface VariantDraft {
  id?: string
  name: string
  value: string
}

const defaultMultivariate: VariantDraft[] = [
  { name: 'Control', value: 'control' },
  { name: 'Treatment', value: 'treatment' },
]

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type Errors = Partial<Record<'name' | 'key' | 'variants', string>>

function validate(name: string, key: string, type: FlagType, variants: VariantDraft[], existingKeys: string[]): Errors {
  const errors: Errors = {}
  if (name.trim().length < 3) errors.name = 'Name must be at least 3 characters.'
  if (!KEY_PATTERN.test(key)) errors.key = 'Use lowercase letters, numbers and single hyphens (e.g. new-checkout).'
  else if (existingKeys.includes(key)) errors.key = 'A flag with this key already exists.'
  if (type === 'multivariate') {
    const values = variants.map((v) => v.value.trim())
    if (variants.length < 2) errors.variants = 'Multivariate flags need at least two variants.'
    else if (variants.some((v) => !v.name.trim() || !v.value.trim())) errors.variants = 'Every variant needs a name and value.'
    else if (new Set(values).size !== values.length) errors.variants = 'Variant values must be unique.'
  }
  return errors
}

export function FlagFormDialog({
  open,
  onOpenChange,
  flag,
  existingKeys,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  flag?: FeatureFlag
  existingKeys: string[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {open ? <FlagForm key={flag?.id ?? 'new'} flag={flag} existingKeys={existingKeys} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function FlagForm({ flag, existingKeys, onDone }: { flag?: FeatureFlag; existingKeys: string[]; onDone: () => void }) {
  const editing = Boolean(flag)
  const [name, setName] = useState(flag?.name ?? '')
  const [key, setKey] = useState(flag?.key ?? '')
  const [keyTouched, setKeyTouched] = useState(editing)
  const [description, setDescription] = useState(flag?.description ?? '')
  const [tags, setTags] = useState(flag?.tags.join(', ') ?? '')
  const [type, setType] = useState<FlagType>(flag?.type ?? 'boolean')
  const [variants, setVariants] = useState<VariantDraft[]>(
    flag?.type === 'multivariate' ? flag.variants.map((v) => ({ id: v.id, name: v.name, value: v.value })) : defaultMultivariate,
  )
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const otherKeys = existingKeys.filter((k) => k !== flag?.key)

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors = validate(name, key, type, variants, otherKeys)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
    try {
      if (flag) {
        await flagsService.update(flag.id, {
          name: name.trim(),
          description: description.trim(),
          tags: tagList,
          ...(flag.type === 'multivariate'
            ? { variants: variants.map((v, i) => ({ id: v.id ?? `var_${Date.now()}_${i}`, name: v.name.trim(), value: v.value.trim() })) }
            : {}),
        })
        toast.success('Flag updated', { description: name })
      } else {
        await flagsService.create({
          name: name.trim(),
          key,
          description: description.trim(),
          type,
          tags: tagList,
          variants:
            type === 'boolean'
              ? [
                  { name: 'On', value: 'true' },
                  { name: 'Off', value: 'false' },
                ]
              : variants.map((v) => ({ name: v.name.trim(), value: v.value.trim() })),
        })
        toast.success('Flag created', { description: `${key} is disabled in every environment until you enable it.` })
      }
      await revalidate(keys.flags, keys.flag(key))
      onDone()
    } catch (err) {
      toast.error('Could not save flag', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit flag' : 'Create feature flag'}</DialogTitle>
        <DialogDescription>
          {editing ? 'Update the flag metadata. The key cannot be changed.' : 'New flags start disabled in every environment.'}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="flag-name">Name</FieldLabel>
          <Input
            id="flag-name"
            value={name}
            autoFocus
            aria-invalid={errors.name ? true : undefined}
            onChange={(e) => {
              setName(e.target.value)
              if (!keyTouched) setKey(slugify(e.target.value))
            }}
            placeholder="New checkout flow"
          />
          {errors.name ? <FieldError>{errors.name}</FieldError> : null}
        </Field>

        <Field data-invalid={errors.key ? true : undefined} data-disabled={editing || undefined}>
          <FieldLabel htmlFor="flag-key">Key</FieldLabel>
          <Input
            id="flag-key"
            value={key}
            disabled={editing}
            className="font-mono"
            aria-invalid={errors.key ? true : undefined}
            onChange={(e) => {
              setKeyTouched(true)
              setKey(e.target.value)
            }}
            placeholder="new-checkout-flow"
          />
          {errors.key ? <FieldError>{errors.key}</FieldError> : <FieldDescription>Used by SDKs to evaluate the flag.</FieldDescription>}
        </Field>

        <Field>
          <FieldLabel htmlFor="flag-description">Description</FieldLabel>
          <Textarea
            id="flag-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this flag control?"
            rows={2}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="flag-tags">Tags</FieldLabel>
          <Input id="flag-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="payments, growth" />
          <FieldDescription>Comma separated.</FieldDescription>
        </Field>

        <Field data-disabled={editing || undefined}>
          <FieldLabel>Flag type</FieldLabel>
          <ToggleGroup
            value={[type]}
            onValueChange={(v) => {
              if (v[0]) setType(v[0] as FlagType)
            }}
            variant="outline"
            disabled={editing}
            className="w-full"
          >
            <ToggleGroupItem value="boolean" className="flex-1">
              Boolean
            </ToggleGroupItem>
            <ToggleGroupItem value="multivariate" className="flex-1">
              Multivariate
            </ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>
            {type === 'boolean' ? 'Serves true or false.' : 'Serves one of several string variants.'}
          </FieldDescription>
        </Field>

        {type === 'multivariate' ? (
          <FieldSet data-invalid={errors.variants ? true : undefined}>
            <FieldLegend variant="label">Variants</FieldLegend>
            <div className="flex flex-col gap-2">
              {variants.map((variant, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    aria-label={`Variant ${index + 1} name`}
                    value={variant.name}
                    onChange={(e) => updateVariant(index, { name: e.target.value, ...(variant.id ? {} : { value: slugify(e.target.value) }) })}
                    placeholder="Name"
                  />
                  <Input
                    aria-label={`Variant ${index + 1} value`}
                    value={variant.value}
                    onChange={(e) => updateVariant(index, { value: e.target.value })}
                    placeholder="value"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove variant ${index + 1}`}
                    disabled={variants.length <= 2}
                    onClick={() => setVariants((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={variants.length >= 6}
              onClick={() => setVariants((prev) => [...prev, { name: '', value: '' }])}
            >
              <Plus data-icon="inline-start" />
              Add variant
            </Button>
            {errors.variants ? <FieldError>{errors.variants}</FieldError> : null}
          </FieldSet>
        ) : null}
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create flag'}
        </Button>
      </DialogFooter>
    </form>
  )
}
