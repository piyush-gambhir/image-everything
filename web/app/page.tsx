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
import { FEATURES } from "@/lib/features"

export default function DashboardPage() {
  return (
    <div className="container mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Image, anything.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Read, clean, compress, resize, and convert images. Each tool runs as
          an HTTP API and a UI on top of the same engine — so anything you can
          do here, you can do with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">curl</code>.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          const available = feature.status === "available"
          return (
            <Card
              key={feature.slug}
              className="group relative flex flex-col transition-colors hover:border-foreground/15"
            >
              <CardHeader>
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="flex items-center gap-2 text-base">
                  {feature.title}
                  {!available && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-normal"
                    >
                      soon
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {feature.short}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button
                  asChild
                  variant={available ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  disabled={!available}
                >
                  {available ? (
                    <Link href={`/${feature.slug}`}>Open</Link>
                  ) : (
                    <span aria-disabled>Coming soon</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
