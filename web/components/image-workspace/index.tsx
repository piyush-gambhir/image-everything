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
      className={cn("container mx-auto w-full max-w-6xl px-6 py-6", className)}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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
    <header className="flex items-start gap-3 lg:col-span-2">
      {icon && (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
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
    <aside className={cn("flex flex-col gap-4", className)}>{children}</aside>
  )
}
