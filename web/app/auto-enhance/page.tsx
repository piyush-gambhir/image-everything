import { notFound } from "next/navigation"

import { getFeature } from "@/lib/features"

import { AutoEnhanceClient } from "./auto-enhance-client"

export default function Page() {
  const feature = getFeature("auto-enhance")
  if (!feature) notFound()
  return <AutoEnhanceClient />
}
