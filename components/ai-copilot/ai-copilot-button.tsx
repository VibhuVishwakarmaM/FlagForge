import { forwardRef } from 'react'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const AiCopilotButton = forwardRef<HTMLButtonElement, { open: boolean; onToggle: () => void }>(
  function AiCopilotButton({ open, onToggle }, ref) {
    const label = open ? 'Close FlagForge Intelligence' : 'Ask FlagForge Intelligence'
    return (
      <div className={cn('group fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6', open && 'max-sm:hidden')}>
        <span
          role="tooltip"
          id="ai-copilot-tooltip"
          className="pointer-events-none absolute top-1/2 right-full mr-3 -translate-y-1/2 translate-x-1 rounded-md border border-border bg-popover px-2.5 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-has-[:focus-visible]:translate-x-0 group-has-[:focus-visible]:opacity-100"
        >
          {open ? 'Close assistant' : 'Ask FlagForge Intelligence'}
        </span>
        <button
          ref={ref}
          type="button"
          onClick={onToggle}
          aria-label={label}
          aria-expanded={open}
          aria-controls="ai-copilot-panel"
          aria-describedby="ai-copilot-tooltip"
          className="relative flex size-12 items-center justify-center rounded-full border border-foreground/20 bg-primary text-primary-foreground shadow-[0_0_0_1px_oklch(1_0_0/0.06),0_8px_30px_-6px_oklch(1_0_0/0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_0_1px_oklch(1_0_0/0.1),0_10px_40px_-4px_oklch(1_0_0/0.5)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95"
        >
          {!open ? (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-primary/40 motion-safe:animate-ping [animation-duration:3s]"
            />
          ) : null}
          <span className="relative grid place-items-center">
            <Sparkles
              aria-hidden="true"
              className={cn('col-start-1 row-start-1 size-5 transition-all duration-300', open ? 'scale-50 rotate-90 opacity-0' : 'scale-100 opacity-100')}
            />
            <X
              aria-hidden="true"
              className={cn('col-start-1 row-start-1 size-5 transition-all duration-300', open ? 'scale-100 opacity-100' : 'scale-50 -rotate-90 opacity-0')}
            />
          </span>
        </button>
      </div>
    )
  },
)
