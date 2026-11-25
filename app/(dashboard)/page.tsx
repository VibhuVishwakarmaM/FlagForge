import { PageHeader } from '@/components/app/page-header'
import {
  EvaluationActivityCard,
  ExperimentPerformanceCard,
  QuickActionsCard,
  RecentActivityCard,
  RolloutOverviewCard,
} from '@/components/overview/overview-panels'
import { OverviewStats } from '@/components/overview/overview-stats'

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" description="Health of your feature flags and experiments at a glance." />
      <OverviewStats />
      <div className="grid gap-4 lg:grid-cols-3">
        <EvaluationActivityCard />
        <QuickActionsCard />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <RolloutOverviewCard />
        <ExperimentPerformanceCard />
        <RecentActivityCard />
      </div>
    </>
  )
}
