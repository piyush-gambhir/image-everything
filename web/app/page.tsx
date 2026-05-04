import { ArrowUpRight, BookOpen, Sparkles } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  FEATURES,
  featuresByCategory,
} from "@/lib/features"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const grouped = featuresByCategory()
  const totalAvailable = FEATURES.filter((f) => f.status === "available").length

  return (
    <div className="container mx-auto w-full max-w-6xl px-6 py-10">
      {/* Hero */}
      <header className="relative mb-12 overflow-hidden rounded-2xl border bg-gradient-to-br from-muted/40 via-muted/10 to-transparent px-8 py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-gradient-to-br from-fuchsia-500/20 via-blue-500/10 to-transparent blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-gradient-to-tr from-emerald-500/20 via-amber-500/10 to-transparent blur-3xl"
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-4 gap-1.5 font-normal">
              <Sparkles className="size-3" />
              {totalAvailable} tools live · API + UI
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Image, anything.
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">
              Read, clean, compress, resize, convert, crop, rotate, watermark,
              enhance, chain, and batch. Each tool is an HTTP API and a UI on
              top of the same engine — so anything you can do here, you can do
              with{" "}
              <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-sm">
                curl
              </code>
              .
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button asChild size="sm">
                <Link href="/transform">
                  Try the pipeline
                  <ArrowUpRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/metadata">Read metadata</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a
                  href={
                    process.env.NEXT_PUBLIC_API_URL
                      ? `${process.env.NEXT_PUBLIC_API_URL}/docs`
                      : "http://localhost:3001/docs"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BookOpen />
                  API docs
                  <ArrowUpRight />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Category sections */}
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat]
        if (items.length === 0) return null
        return (
          <section key={cat} className="mb-12 last:mb-0">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                {CATEGORY_LABELS[cat]}
              </h2>
              <span className="text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? "tool" : "tools"}
              </span>
            </div>
            <div
              className={cn(
                "grid gap-4",
                items.length >= 3
                  ? "sm:grid-cols-2 lg:grid-cols-3"
                  : "sm:grid-cols-2"
              )}
            >
              {items.map((feature) => {
                const Icon = feature.icon
                const available = feature.status === "available"
                return (
                  <Link
                    key={feature.slug}
                    href={`/${feature.slug}`}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-all duration-200",
                      "hover:-translate-y-px hover:border-foreground/20 hover:shadow-sm",
                      !available && "pointer-events-none opacity-60"
                    )}
                  >
                    <div
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                        feature.accent
                      )}
                    />
                    <Card className="relative z-10 flex h-full flex-col border-0 bg-transparent shadow-none">
                      <CardHeader className="space-y-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground/80 ring-1 ring-border/40 transition-colors group-hover:bg-foreground group-hover:text-background">
                          <Icon className="size-4" />
                        </div>
                        <CardTitle className="flex items-center gap-2 text-base font-medium">
                          {feature.title}
                          {!available && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-normal"
                            >
                              soon
                            </Badge>
                          )}
                          <ArrowUpRight className="ml-auto size-4 -translate-x-0.5 translate-y-0.5 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-xs">
                          {feature.short}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto pt-0">
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
