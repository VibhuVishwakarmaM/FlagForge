'use client'

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}

interface SimpleSelectProps<T extends string> {
  options: SelectOption<T>[]
  value: T | null
  onValueChange: (value: T) => void
  placeholder?: string
  id?: string
  className?: string
  size?: 'sm' | 'default'
  invalid?: boolean
  disabled?: boolean
  'aria-label'?: string
}

export function SimpleSelect<T extends string>({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  id,
  className,
  size,
  invalid,
  disabled,
  'aria-label': ariaLabel,
}: SimpleSelectProps<T>) {
  return (
    <Select
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next as T)
      }}
    >
      <SelectTrigger
        id={id}
        size={size}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn('w-full', className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
