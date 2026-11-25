'use client'

import { useState } from 'react'
import { MailPlus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { RoleBadge } from '@/components/app/badges'
import { ConfirmDialog } from '@/components/app/confirm-dialog'
import { SimpleSelect } from '@/components/app/simple-select'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/app/states'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { keys, revalidate, useTeam } from '@/hooks/use-api'
import { teamService } from '@/lib/api/services'
import { formatRelative, initials } from '@/lib/format'
import type { Role, TeamMember } from '@/lib/types'

const roleOptions: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'viewer', label: 'Viewer' },
]

const roleDescriptions: Record<Role, string> = {
  admin: 'Full access, including members, SDK keys and workspace settings.',
  developer: 'Create and edit flags, rules and experiments in all environments.',
  viewer: 'Read-only access to flags, experiments, analytics and logs.',
}

export function TeamView() {
  const { data, error, mutate } = useTeam()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removing, setRemoving] = useState<TeamMember | null>(null)

  async function changeRole(member: TeamMember, role: Role) {
    if (role === member.role) return
    if (member.role === 'admin' && data?.filter((m) => m.role === 'admin').length === 1) {
      toast.error('A workspace needs at least one admin')
      return
    }
    await teamService.updateRole(member.id, role)
    await revalidate(keys.team)
    toast.success('Role updated', { description: `${member.name} is now a ${role}.` })
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {roleOptions.map((r) => (
          <Card key={r.value} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{r.label}</CardTitle>
                <span className="font-mono text-sm text-muted-foreground">{data?.filter((m) => m.role === r.value).length ?? '–'}</span>
              </div>
              <CardDescription>{roleDescriptions[r.value]}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setInviteOpen(true)}>
          <MailPlus data-icon="inline-start" />
          Invite member
        </Button>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : !data ? (
        <TableSkeleton />
      ) : data.length === 0 ? (
        <EmptyState icon={Users} title="No team members" description="Invite teammates to collaborate on flags." />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Member</TableHead>
                  <TableHead className="w-40">Role</TableHead>
                  <TableHead className="hidden md:table-cell">Last active</TableHead>
                  <TableHead className="w-12 pr-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{initials(m.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <span className="flex items-center gap-2 truncate font-medium">
                            {m.name}
                            {m.status === 'invited' ? (
                              <Badge variant="outline" className="font-normal">
                                Invited
                              </Badge>
                            ) : null}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">{m.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <SimpleSelect
                        size="sm"
                        aria-label={`Role for ${m.name}`}
                        options={roleOptions}
                        value={m.role}
                        onValueChange={(role) => void changeRole(m, role)}
                      />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {m.status === 'invited' ? 'Pending invite' : formatRelative(m.lastActiveAt)}
                    </TableCell>
                    <TableCell className="pr-4">
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${m.name}`} onClick={() => setRemoving(m)}>
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} existingEmails={(data ?? []).map((m) => m.email)} />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove member?"
        description={`${removing?.name} will immediately lose access to this workspace.`}
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing) return
          await teamService.remove(removing.id)
          await revalidate(keys.team)
          toast.success('Member removed')
        }}
      />
    </>
  )
}

function InviteDialog({ open, onOpenChange, existingEmails }: { open: boolean; onOpenChange: (o: boolean) => void; existingEmails: string[] }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('developer')
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setName('')
    setEmail('')
    setRole('developer')
    setErrors({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!name.trim()) next.name = 'Name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.'
    else if (existingEmails.includes(email.toLowerCase())) next.email = 'This person is already a member.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSubmitting(true)
    try {
      await teamService.invite({ name: name.trim(), email: email.toLowerCase(), role })
      await revalidate(keys.team)
      toast.success('Invitation sent', { description: email })
      reset()
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>They will receive an email invitation to join the workspace.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="invite-name">Name</FieldLabel>
              <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={errors.name ? true : undefined} />
              {errors.name ? <FieldError>{errors.name}</FieldError> : null}
            </Field>
            <Field data-invalid={errors.email ? true : undefined}>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={errors.email ? true : undefined} />
              {errors.email ? <FieldError>{errors.email}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <SimpleSelect id="invite-role" options={roleOptions} value={role} onValueChange={setRole} />
              <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
