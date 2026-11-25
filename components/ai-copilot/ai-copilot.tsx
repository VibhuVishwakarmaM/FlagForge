'use client'

import { useCallback, useRef, useState } from 'react'
import { askAssistant } from '@/lib/ai/assistant'
import type { ChatMessage } from '@/lib/ai/types'
import { AiCopilotButton } from './ai-copilot-button'
import { AiCopilotPanel } from './ai-copilot-panel'

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

export function AiCopilot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState(false)
  const conversationRef = useRef(0)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const send = useCallback(async (prompt: string) => {
    const conversation = conversationRef.current
    setMessages((prev) => [...prev, { id: uid(), role: 'user', content: prompt }])
    setPending(true)
    try {
      const response = await askAssistant(prompt)
      if (conversation !== conversationRef.current) return
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', response }])
    } catch (error) {
      if (conversation !== conversationRef.current) return
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'error',
          content: error instanceof Error ? `Couldn't load workspace data: ${error.message}` : 'Something went wrong.',
          retryPrompt: prompt,
        },
      ])
    } finally {
      if (conversation === conversationRef.current) setPending(false)
    }
  }, [])

  const reset = useCallback(() => {
    conversationRef.current += 1
    setMessages([])
    setPending(false)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])

  return (
    <>
      <AiCopilotPanel open={open} messages={messages} pending={pending} onSend={send} onClose={close} onReset={reset} />
      <AiCopilotButton ref={buttonRef} open={open} onToggle={() => setOpen((o) => !o)} />
    </>
  )
}
