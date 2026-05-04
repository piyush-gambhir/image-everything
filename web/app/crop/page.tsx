import { notFound } from "next/navigation"

import { FeaturePlaceholder } from "@/components/feature-placeholder"
import { getFeature } from "@/lib/features"

export default function Page() {
  const feature = getFeature("crop")
  if (!feature) notFound()
  return <FeaturePlaceholder feature={feature} />
}
