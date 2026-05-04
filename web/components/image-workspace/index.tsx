import * as React from "react"

import { cn } from "@/lib/utils"

export { ImageDropZone } from "./drop-zone"

export function ImageWorkspace({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("container mx-auto w-full max-w-6xl px-6 py-8", className)}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {children}
      </div>
    </div>
  )
}

export function WorkspaceHeader({
  title,
  description,
  icon,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <header className="flex items-start gap-4 lg:col-span-2">
      {icon && (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted shadow-sm ring-1 ring-border/60">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </header>
  )
}

export function WorkspaceMain({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      {children}
    </section>
  )
}

export function WorkspaceAside({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <aside
      className={cn(
        "flex flex-col gap-3 lg:sticky lg:top-16 lg:self-start",
        className
      )}
    >
      {children}
    </aside>
  )
}
