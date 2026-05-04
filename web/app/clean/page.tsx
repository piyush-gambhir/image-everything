import { notFound } from "next/navigation"

import { getFeature } from "@/lib/features"

import { CleanClient } from "./clean-client"

export default function Page() {
  const feature = getFeature("clean")
  if (!feature) notFound()
  return <CleanClient />
}
