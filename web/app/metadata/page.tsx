import { notFound } from "next/navigation"

import { getFeature } from "@/lib/features"

import { MetadataClient } from "./metadata-client"

export default function Page() {
  const feature = getFeature("metadata")
  if (!feature) notFound()
  return <MetadataClient />
}
