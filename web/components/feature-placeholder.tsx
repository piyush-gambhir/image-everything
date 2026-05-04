import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Feature } from "@/lib/features"

export function FeaturePlaceholder({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  const available = feature.status === "available"
  return (
    <div className="container mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {feature.title}
              {!available && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  coming soon
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{feature.short}</p>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {feature.description}
        </p>
      </header>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
          <p>
            {available
              ? "This feature is wired up to its API in an upcoming step."
              : "This feature will land after the core five."}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
