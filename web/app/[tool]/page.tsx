import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { ToolPageClient } from "@/components/tool-workspace/tool-page-client"
import {
  TOOL_MANIFEST,
  getToolBySlug,
  resolveToolSlug,
} from "@/lib/tools/manifest"

type ToolPageProps = {
  params: Promise<{ tool: string }>
}

export function generateStaticParams() {
  return TOOL_MANIFEST.map((tool) => ({ tool: tool.slug }))
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { tool: requestedSlug } = await params
  const slug = resolveToolSlug(requestedSlug)
  const tool = slug ? getToolBySlug(slug) : undefined
  if (!tool) return {}

  return {
    title: tool.title,
    description: tool.description,
    alternates: { canonical: `/${tool.slug}` },
    openGraph: {
      title: `${tool.title} · Image Everything`,
      description: tool.description,
      url: `/${tool.slug}`,
    },
  }
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { tool: requestedSlug } = await params
  const slug = resolveToolSlug(requestedSlug)
  if (!slug) notFound()
  if (slug !== requestedSlug) redirect(`/${slug}`)

  const tool = getToolBySlug(slug)
  if (!tool) notFound()

  return <ToolPageClient tool={tool} />
}
