import { notFound } from "next/navigation"

import { getFeature } from "@/lib/features"

import { ResizeClient } from "./resize-client"

export default function Page() {
  const feature = getFeature("resize")
  if (!feature) notFound()
  return <ResizeClient />
}
