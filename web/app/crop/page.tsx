import { notFound } from "next/navigation"

import { getFeature } from "@/lib/features"

import { CropClient } from "./crop-client"

export default function Page() {
  const feature = getFeature("crop")
  if (!feature) notFound()
  return <CropClient />
}
