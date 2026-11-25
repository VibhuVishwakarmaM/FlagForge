import { FlagDetails } from '@/components/flags/flag-details'

export default async function FlagDetailsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  return <FlagDetails flagKey={decodeURIComponent(key)} />
}
