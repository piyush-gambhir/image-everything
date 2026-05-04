import { notFound } from "next/navigation"

import { getFeature } from "@/lib/features"

import { WatermarkClient } from "./watermark-client"

export default function Page() {
  const feature = getFeature("watermark")
  if (!feature) notFound()
  return <WatermarkClient />
}
