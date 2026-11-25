'use client'

import { createContext, useContext, useState } from 'react'
import type { EnvironmentKey } from '@/lib/types'

interface EnvironmentContextValue {
  environment: EnvironmentKey
  setEnvironment: (env: EnvironmentKey) => void
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null)

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<EnvironmentKey>('production')
  return (
    <EnvironmentContext.Provider value={{ environment, setEnvironment }}>{children}</EnvironmentContext.Provider>
  )
}

export function useEnvironment() {
  const ctx = useContext(EnvironmentContext)
  if (!ctx) throw new Error('useEnvironment must be used within EnvironmentProvider')
  return ctx
}
