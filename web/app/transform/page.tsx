import { notFound } from "next/navigation"

import { getFeature } from "@/lib/features"

import { TransformClient } from "./transform-client"

export default function Page() {
  const feature = getFeature("transform")
  if (!feature) notFound()
  return <TransformClient />
}
