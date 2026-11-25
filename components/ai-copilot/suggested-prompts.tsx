import { Activity, ArrowRight, Flag, FlaskConical, ShieldAlert, ShoppingCart, type LucideIcon } from 'lucide-react'
import { SUGGESTED_PROMPTS } from '@/lib/ai/assistant'

const icons: Record<(typeof SUGGESTED_PROMPTS)[number]['id'], LucideIcon> = {
  experiments: FlaskConical,
  production: Flag,
  risks: ShieldAlert,
  analytics: Activity,
  checkout: ShoppingCart,
}

export function SuggestedPrompts({ onSelect, disabled }: { onSelect: (prompt: string) => void; disabled?: boolean }) {
  return (
    <ul className="flex flex-col gap-2" aria-label="Suggested prompts">
      {SUGGESTED_PROMPTS.map((item, i) => {
        const Icon = icons[item.id]
        return (
          <li
            key={item.id}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
            style={{ animationDelay: `${120 + i * 60}ms` }}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item.prompt)}
              className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-all hover:border-foreground/30 hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">{item.title}</span>
                <span className="truncate text-xs text-muted-foreground">{item.description}</span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                aria-hidden="true"
              />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function FollowUps({ items, onSelect, disabled }: { items: string[]; onSelect: (prompt: string) => void; disabled?: boolean }) {
  if (!items.length) return null
  return (
    <div className="flex flex-col gap-1.5 pl-9.5 animate-in fade-in duration-500">
      <p className="text-[11px] font-medium text-muted-foreground">Suggested follow-ups</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item)}
            className="rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:border-foreground/30 hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}
