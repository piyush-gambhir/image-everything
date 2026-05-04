import { notFound } from "next/navigation"

import { getFeature } from "@/lib/features"

import { ConvertClient } from "./convert-client"

export default function Page() {
  const feature = getFeature("convert")
  if (!feature) notFound()
  return <ConvertClient />
}
