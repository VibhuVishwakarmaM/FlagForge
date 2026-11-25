import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CopilotAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-gradient-to-br from-foreground/15 to-foreground/[0.02]',
        className,
      )}
    >
      <Sparkles className="size-3.5" />
    </span>
  )
}
