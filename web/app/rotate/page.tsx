import { notFound } from "next/navigation"

import { getFeature } from "@/lib/features"

import { RotateClient } from "./rotate-client"

export default function Page() {
  const feature = getFeature("rotate")
  if (!feature) notFound()
  return <RotateClient />
}
