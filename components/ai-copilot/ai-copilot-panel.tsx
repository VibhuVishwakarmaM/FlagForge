'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, MessageSquarePlus, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AssistantMessage, ChatMessage as ChatMessageType } from '@/lib/ai/types'
import { cn } from '@/lib/utils'
import { ChatMessage, TypingIndicator } from './chat-message'
import { CopilotAvatar } from './copilot-avatar'
import { FollowUps, SuggestedPrompts } from './suggested-prompts'

const WELCOME =
  "Hello! I'm FlagForge Intelligence. I can help you understand your feature flags, analyze experiments, inspect rollout configurations, and identify potential release risks."

export function AiCopilotPanel({
  open,
  messages,
  pending,
  onSend,
  onClose,
  onReset,
}: {
  open: boolean
  messages: ChatMessageType[]
  pending: boolean
  onSend: (prompt: string) => void
  onClose: () => void
  onReset: () => void
}) {
  const [draft, setDraft] = useState('')
  const [validation, setValidation] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 200)
      return () => window.clearTimeout(id)
    }
  }, [open])

  const lastAssistant = [...messages].reverse().find((m): m is AssistantMessage => m.role === 'assistant')
  const showFollowUps = !pending && lastAssistant && messages[messages.length - 1] === lastAssistant

  function submit(text: string) {
    if (pending) return
    if (!text.trim()) {
      setValidation('Type a question to get started.')
      inputRef.current?.focus()
      return
    }
    setValidation(null)
    setDraft('')
    onSend(text.trim())
  }

  return (
    <section
      id="ai-copilot-panel"
      role="dialog"
      aria-modal="false"
      aria-label="FlagForge Intelligence assistant"
      inert={!open}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
      className={cn(
        'fixed z-50 flex flex-col overflow-hidden border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/60 transition-all duration-300 ease-out',
        'inset-x-0 bottom-0 h-[88dvh] rounded-t-2xl',
        'sm:inset-x-auto sm:right-6 sm:bottom-22 sm:h-[min(720px,calc(100dvh-8rem))] sm:w-[420px] sm:rounded-2xl',
        open
          ? 'pointer-events-auto translate-y-0 opacity-100 sm:scale-100'
          : 'pointer-events-none translate-y-6 opacity-0 sm:scale-95',
        'origin-bottom-right',
      )}
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <CopilotAvatar className="size-9 rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">FlagForge Intelligence</h2>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
              Demo Assistant
            </span>
          </div>
          <p className="text-xs text-muted-foreground">AI Release Assistant</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            onReset()
            setDraft('')
            setValidation(null)
          }}
          disabled={pending || messages.length === 0}
          aria-label="New conversation"
          title="New conversation"
        >
          <MessageSquarePlus aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close assistant" title="Close">
          <X aria-hidden="true" />
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
        <div className="flex flex-col gap-5">
          <div className="flex gap-2.5">
            <CopilotAvatar />
            <div className="flex flex-col gap-2 text-sm leading-relaxed">
              <p className="text-pretty">{WELCOME}</p>
              <p>What would you like to explore today?</p>
            </div>
          </div>

          {messages.length === 0 ? <SuggestedPrompts onSelect={submit} disabled={pending} /> : null}

          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} onRetry={submit} />
          ))}

          {pending ? <TypingIndicator /> : null}
          {showFollowUps ? <FollowUps items={lastAssistant.response.followUps} onSelect={submit} disabled={pending} /> : null}
        </div>
      </div>

      <form
        className="flex flex-col gap-1.5 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit(draft)
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border border-input bg-input/30 p-1.5 pl-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <label htmlFor="ai-copilot-input" className="sr-only">
            Ask about your flags, experiments or analytics
          </label>
          <textarea
            id="ai-copilot-input"
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (validation) setValidation(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return
                e.preventDefault()
                submit(draft)
              }
            }}
            placeholder="Ask about flags, experiments, rollouts…"
            aria-invalid={validation ? true : undefined}
            aria-describedby={validation ? 'ai-copilot-validation' : 'ai-copilot-hint'}
            className="field-sizing-content max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon" disabled={pending || !draft.trim()} aria-label="Send message">
            <ArrowUp aria-hidden="true" />
          </Button>
        </div>
        {validation ? (
          <p id="ai-copilot-validation" role="alert" className="px-1 text-xs text-destructive">
            {validation}
          </p>
        ) : (
          <p id="ai-copilot-hint" className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3" aria-hidden="true" />
            Read-only demo using workspace data · Enter to send, Shift+Enter for a new line
          </p>
        )}
      </form>
    </section>
  )
}
