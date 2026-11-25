'use client'

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { EnvironmentDot } from '@/components/app/badges'
import { CardGridSkeleton, ErrorState } from '@/components/app/states'
import { useEnvironment } from '@/components/providers/environment-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useEnvironments, useFlags } from '@/hooks/use-api'
import { environmentKeys, environmentLabels } from '@/lib/format'
import { cn } from '@/lib/utils'

export function EnvironmentsView() {
  const { data: envs, error, mutate } = useEnvironments()
  const { data: flags } = useFlags()
  const { environment, setEnvironment } = useEnvironment()

  if (error) return <ErrorState error={error} onRetry={() => mutate()} />

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {!envs ? (
          <CardGridSkeleton count={3} />
        ) : (
          envs.map((env) => {
            const enabled = flags?.filter((f) => f.environments[env.key].enabled).length ?? 0
            const active = env.key === environment
            return (
              <Card key={env.key} className={cn(active && 'ring-2 ring-primary/60')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <EnvironmentDot env={env.key} />
                    {env.name}
                  </CardTitle>
                  <CardDescription>{env.description}</CardDescription>
                  {active ? (
                    <CardAction>
                      <Badge>Active</Badge>
                    </CardAction>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs text-muted-foreground">Flags enabled</dt>
                      <dd className="font-mono text-lg font-semibold">
                        {enabled}
                        <span className="text-sm font-normal text-muted-foreground">/{flags?.length ?? 0}</span>
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs text-muted-foreground">Default rollout</dt>
                      <dd className="font-mono text-lg font-semibold">{env.defaultRollout}%</dd>
                    </div>
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <dt className="text-xs text-muted-foreground">SDK key</dt>
                      <dd className="font-mono text-xs">{env.sdkKeyHint}</dd>
                    </div>
                  </dl>
                </CardContent>
                <CardFooter className="justify-between border-t">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {env.requireApproval ? (
                      <>
                        <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
                        Changes require approval
                      </>
                    ) : (
                      'No approval required'
                    )}
                  </span>
                  <Button size="sm" variant={active ? 'secondary' : 'outline'} disabled={active} onClick={() => setEnvironment(env.key)}>
                    {active ? 'Selected' : 'Switch'}
                  </Button>
                </CardFooter>
              </Card>
            )
          })
        )}
      </div>

      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Environment comparison</CardTitle>
          <CardDescription>Rollout for every flag across environments</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Flag</TableHead>
                {environmentKeys.map((k) => (
                  <TableHead key={k} className="text-center last:pr-4">
                    <span className="inline-flex items-center gap-1.5">
                      <EnvironmentDot env={k} />
                      {environmentLabels[k]}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(flags ?? []).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="pl-4">
                    <Link href={`/flags/${f.key}`} className="font-mono text-sm hover:text-primary">
                      {f.key}
                    </Link>
                  </TableCell>
                  {environmentKeys.map((k) => {
                    const cfg = f.environments[k]
                    return (
                      <TableCell key={k} className="text-center font-mono text-sm tabular-nums last:pr-4">
                        {cfg.enabled ? cfg.rollout + '%' : <span className="text-muted-foreground">off</span>}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
