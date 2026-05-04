import { notFound } from "next/navigation"

import { getFeature } from "@/lib/features"

import { BatchClient } from "./batch-client"

export default function Page() {
  const feature = getFeature("batch")
  if (!feature) notFound()
  return <BatchClient />
}
