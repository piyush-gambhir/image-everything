"use client"

import {
  ArrowUpRight,
  Braces,
  CheckCircle2,
  Images,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FEATURES,
  FEATURE_CATEGORIES,
  type FeatureCategory,
} from "@/lib/features"
import { cn } from "@/lib/utils"

const CATEGORY_ORDER: FeatureCategory[] = [
  "optimize",
  "edit",
  "metadata",
  "automate",
]

const CATEGORY_STYLES: Record<FeatureCategory, string> = {
  optimize: "bg-brand-soft text-brand",
  edit: "bg-info-soft text-info",
  metadata: "bg-success-soft text-success",
  automate: "bg-warning-soft text-warning",
}

export function ToolExplorer() {
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState<FeatureCategory | "all">("all")

  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return FEATURES.filter((feature) => {
      const matchesCategory =
        category === "all" || feature.category === category
      const categoryLabel = FEATURE_CATEGORIES[feature.category].label
      const matchesQuery =
        !normalized ||
        [feature.title, feature.short, feature.description, categoryLabel]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      return matchesCategory && matchesQuery
    })
  }, [category, query])

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-7 lg:px-9 lg:py-10">
      <section className="relative overflow-hidden rounded-3xl bg-surface-1 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.7fr)] lg:items-end">
          <div className="max-w-3xl">
            <Badge className="mb-4 gap-1.5 bg-brand-soft text-brand hover:bg-brand-soft">
              <Sparkles className="size-3" />
              Open-source image infrastructure
            </Badge>
            <h1 className="max-w-3xl text-3xl leading-[1.08] font-semibold tracking-[-0.035em] sm:text-4xl lg:text-5xl">
              Every image job. One clean workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Compress, crop, convert, resize, clean metadata, watermark, and
              batch-process images. Every tool uses the same public API you can
              call from your own code.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <TrustPill icon={CheckCircle2} label="11 working tools" />
              <TrustPill icon={Braces} label="Versioned REST API" />
              <TrustPill icon={ShieldCheck} label="Self-hosted privacy" />
            </div>
          </div>

          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search compress, WebP, metadata…"
                aria-label="Search image tools"
                className="h-11 rounded-xl bg-background pr-20 pl-10 shadow-sm"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md bg-muted px-2 py-1 font-mono text-[10px] font-medium text-muted-foreground sm:block">
                {FEATURES.length} tools
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              JPEG · PNG · WebP · AVIF · GIF · TIFF · HEIC · HEIF
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="toolbox-heading" className="mt-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-brand uppercase">
              Toolbox
            </p>
            <h2 id="toolbox-heading" className="mt-1 text-xl font-semibold">
              Pick a job and drop in an image
            </h2>
          </div>
          <div
            className="scroll-none flex max-w-full items-center gap-1.5 overflow-x-auto pb-1"
            aria-label="Filter image tools by category"
          >
            <FilterButton
              active={category === "all"}
              onClick={() => setCategory("all")}
            >
              All
            </FilterButton>
            {CATEGORY_ORDER.map((item) => (
              <FilterButton
                key={item}
                active={category === item}
                onClick={() => setCategory(item)}
              >
                {FEATURE_CATEGORIES[item].label}
              </FilterButton>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <span aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "tool" : "tools"}
            {query ? ` matching “${query}”` : " ready to use"}
          </span>
          {query && (
            <Button variant="ghost" size="xs" onClick={() => setQuery("")}>
              Clear search
            </Button>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((feature) => {
              const Icon = feature.icon
              const categoryMeta = FEATURE_CATEGORIES[feature.category]
              return (
                <Link
                  key={feature.slug}
                  href={`/${feature.slug}`}
                  className="group relative min-h-44 overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-foreground/8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/5 hover:ring-brand/25 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-xl",
                        CATEGORY_STYLES[feature.category]
                      )}
                    >
                      <Icon className="size-5" strokeWidth={1.8} />
                    </span>
                    <span className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors group-hover:bg-brand-soft group-hover:text-brand">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>
                  <p className="mt-5 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                    {categoryMeta.label}
                  </p>
                  <h3 className="mt-1 text-base font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-muted-foreground">
                    {feature.description}
                  </p>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="mt-3 grid min-h-64 place-items-center rounded-2xl bg-muted/60 p-8 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-background text-muted-foreground shadow-sm">
                <Images className="size-5" />
              </span>
              <p className="mt-4 font-semibold">No matching image tool</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try “convert”, “crop”, “metadata”, or clear the filters.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-9 grid gap-3 rounded-2xl bg-surface-1 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <div>
          <h2 className="font-semibold">Building an image workflow?</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Use the same endpoints as this UI. Multipart uploads go straight to
            your configured Image Everything API and results stream back with
            dimensions, format, and file-size headers.
          </p>
        </div>
        <Button asChild className="mt-2 sm:mt-0">
          <Link href="/api-reference">
            Explore the API <ArrowUpRight />
          </Link>
        </Button>
      </section>
    </div>
  )
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0",
        active && "bg-brand text-brand-foreground hover:bg-brand/85"
      )}
    >
      {children}
    </Button>
  )
}

function TrustPill({
  icon: Icon,
  label,
}: {
  icon: typeof ShieldCheck
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-foreground/8">
      <Icon className="size-3.5 text-brand" />
      {label}
    </span>
  )
}
