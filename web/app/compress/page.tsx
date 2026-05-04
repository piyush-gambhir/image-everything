import { notFound } from "next/navigation"

import { getFeature } from "@/lib/features"

import { CompressClient } from "./compress-client"

export default function Page() {
  const feature = getFeature("compress")
  if (!feature) notFound()
  return <CompressClient />
}
