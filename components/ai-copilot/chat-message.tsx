import { AlertCircle, Database, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMessage as ChatMessageType } from '@/lib/ai/types'
import { InsightBlock } from './insight-card'
import { CopilotAvatar } from './copilot-avatar'

export function ChatMessage({
  message,
  onRetry,
}: {
  message: ChatMessageType
  onRetry?: (prompt: string) => void
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-300">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          {message.content}
        </p>
      </div>
    )
  }

  if (message.role === 'error') {
    return (
      <div className="flex gap-2.5 animate-in fade-in duration-300">
        <CopilotAvatar />
        <div className="flex flex-1 flex-col items-start gap-2 rounded-2xl rounded-tl-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 text-sm">
            <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
            {message.content}
          </p>
          {onRetry ? (
            <Button size="xs" variant="outline" onClick={() => onRetry(message.retryPrompt)}>
              <RotateCw data-icon="inline-start" aria-hidden="true" />
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  const { response } = message
  return (
    <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-500">
      <CopilotAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {response.blocks.map((block, i) => (
          <InsightBlock key={`${block.type}-${i}`} block={block} />
        ))}
        {response.sources.length ? (
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <Database className="size-3" aria-hidden="true" />
            <span className="sr-only">Data sources:</span>
            {response.sources.map((s) => (
              <span key={s} className="rounded-md border border-border px-1.5 py-0.5">
                {s}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-2.5 animate-in fade-in duration-300" role="status">
      <CopilotAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-3">
        <span className="sr-only">FlagForge Intelligence is analyzing your data</span>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
