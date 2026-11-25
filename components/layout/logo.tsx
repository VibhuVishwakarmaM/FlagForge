import Link from 'next/link'
import { Flag } from 'lucide-react'

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Flag className="size-4" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold tracking-tight">FlagForge</span>
    </Link>
  )
}
