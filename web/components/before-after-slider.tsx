"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

type Props = {
  before: string
  after: string
  beforeLabel?: string
  afterLabel?: string
  className?: string
}

export function BeforeAfterSlider({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  className,
}: Props) {
  const [position, setPosition] = React.useState(50)
  const [isDragging, setIsDragging] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const move = React.useCallback((clientX: number) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.max(0, Math.min(100, pct)))
  }, [])

  const onPointerDown = (event: React.PointerEvent) => {
    event.preventDefault()
    ;(event.target as Element).setPointerCapture?.(event.pointerId)
    setIsDragging(true)
    move(event.clientX)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!isDragging) return
    move(event.clientX)
  }

  const onPointerUp = () => setIsDragging(false)

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "group relative w-full touch-none overflow-hidden rounded-lg border bg-muted/30 select-none",
        isDragging ? "cursor-ew-resize" : "cursor-grab active:cursor-ew-resize",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after}
        alt={afterLabel}
        draggable={false}
        className="block h-auto w-full"
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before}
          alt={beforeLabel}
          draggable={false}
          className="block h-auto w-full"
        />
      </div>
      <div
        className="absolute top-2 left-2 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground uppercase backdrop-blur"
        aria-hidden
      >
        {beforeLabel}
      </div>
      <div
        className="absolute top-2 right-2 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground uppercase backdrop-blur"
        aria-hidden
      >
        {afterLabel}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
        style={{ left: `${position}%` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/2 z-10 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-background shadow-md"
        style={{ left: `${position}%` }}
        aria-hidden
      >
        <ChevronLeft className="size-3" />
        <ChevronRight className="size-3" />
      </div>
    </div>
  )
}
