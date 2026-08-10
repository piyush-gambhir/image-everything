"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { SerializableValue, ToolControl } from "@/lib/tools/types"

export type OptionValues = Record<string, SerializableValue>

export function OptionControls({
  controls,
  value,
  fallbackValue = {},
  unavailableFormats = new Set(),
  onChange,
  className,
}: {
  controls: readonly ToolControl[]
  value: OptionValues
  fallbackValue?: OptionValues
  unavailableFormats?: ReadonlySet<string>
  onChange: (value: OptionValues) => void
  className?: string
}) {
  if (controls.length === 0) {
    return (
      <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
        This tool has no required options. Upload an image and run it as-is.
      </p>
    )
  }

  return (
    <div className={cn("space-y-5", className)}>
      {controls.map((control) => {
        if (!matchesCondition(value, control.visibleWhen)) return null
        return (
          <ControlField
            key={control.path}
            control={control}
            value={getValueAtPath(value, control.path)}
            unavailableFormats={unavailableFormats}
            onChange={(next) => {
              let updated = setValueAtPath(value, control.path, next)
              for (const candidate of controls) {
                if (
                  matchesCondition(updated, candidate.visibleWhen) &&
                  getValueAtPath(updated, candidate.path) === undefined
                ) {
                  const fallback = getValueAtPath(fallbackValue, candidate.path)
                  if (fallback !== undefined) {
                    updated = setValueAtPath(updated, candidate.path, fallback)
                  }
                }
              }
              onChange(updated)
            }}
          />
        )
      })}
    </div>
  )
}

function ControlField({
  control,
  value,
  onChange,
  unavailableFormats,
}: {
  control: ToolControl
  value: SerializableValue | undefined
  onChange: (value: SerializableValue) => void
  unavailableFormats: ReadonlySet<string>
}) {
  const id = `option-${control.path.replace(/[^a-z0-9]/gi, "-")}`

  if (control.type === "boolean") {
    return (
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border bg-background px-3 py-3"
      >
        <span>
          <span className="block text-sm font-medium">{control.label}</span>
          {control.description && (
            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              {control.description}
            </span>
          )}
        </span>
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
      </label>
    )
  }

  if (control.type === "select") {
    return (
      <FieldShell id={id} control={control}>
        <select
          id={id}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) => {
            const option = control.options.find(
              (candidate) => String(candidate.value) === event.target.value
            )
            onChange(option?.value ?? event.target.value)
          }}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {control.options.map((option) => (
            <option
              key={String(option.value)}
              value={String(option.value)}
              disabled={
                control.path === "format" &&
                unavailableFormats.has(String(option.value))
              }
            >
              {option.label}
              {control.path === "format" &&
              unavailableFormats.has(String(option.value))
                ? " (unavailable on this server)"
                : ""}
            </option>
          ))}
        </select>
      </FieldShell>
    )
  }

  if (control.type === "choice-list") {
    const selected = Array.isArray(value) ? value.map(String) : []
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{control.label}</legend>
        {control.description && (
          <p className="text-xs leading-5 text-muted-foreground">
            {control.description}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {control.options?.map((option) => {
            const checked = selected.includes(option.value)
            const unavailable =
              control.path === "formats" && unavailableFormats.has(option.value)
            return (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={unavailable && !checked}
                  onChange={() => {
                    const next = checked
                      ? selected.filter((item) => item !== option.value)
                      : [...selected, option.value]
                    if (
                      next.length < (control.minItems ?? 0) ||
                      next.length >
                        (control.maxItems ?? Number.POSITIVE_INFINITY)
                    ) {
                      return
                    }
                    onChange(next)
                  }}
                  className="size-4 accent-primary"
                />
                {option.label}
                {unavailable ? " (unavailable)" : ""}
              </label>
            )
          })}
        </div>
      </fieldset>
    )
  }

  if (control.type === "number-list") {
    return (
      <NumberListControl
        id={id}
        control={control}
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
      />
    )
  }

  if (control.type === "range") {
    const number = typeof value === "number" ? value : (control.min ?? 0)
    return (
      <FieldShell
        id={id}
        control={control}
        value={`${number}${control.unit ?? ""}`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-3">
          <input
            id={id}
            type="range"
            min={control.min}
            max={control.max}
            step={control.step ?? 1}
            value={number}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full accent-primary"
          />
          <Input
            aria-label={`${control.label} exact value`}
            type="number"
            min={control.min}
            max={control.max}
            step={control.step ?? 1}
            value={number}
            onChange={(event) => onChange(Number(event.target.value))}
            className="h-9 tabular-nums"
          />
        </div>
      </FieldShell>
    )
  }

  if (control.type === "number") {
    return (
      <FieldShell id={id} control={control}>
        <div className="relative">
          <Input
            id={id}
            type="number"
            min={control.min}
            max={control.max}
            step={control.step ?? 1}
            value={typeof value === "number" ? value : ""}
            onChange={(event) =>
              onChange(
                event.target.value === "" ? null : Number(event.target.value)
              )
            }
            className={cn("tabular-nums", control.unit && "pr-14")}
          />
          {control.unit && (
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
              {control.unit}
            </span>
          )}
        </div>
      </FieldShell>
    )
  }

  if (control.type === "textarea") {
    return (
      <FieldShell id={id} control={control}>
        <textarea
          id={id}
          value={typeof value === "string" ? value : ""}
          maxLength={control.maxLength}
          placeholder={control.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </FieldShell>
    )
  }

  return (
    <FieldShell id={id} control={control}>
      <Input
        id={id}
        type={control.type === "date" ? "datetime-local" : control.type}
        value={
          control.type === "date"
            ? toLocalDateTimeValue(typeof value === "string" ? value : "")
            : typeof value === "string"
              ? value
              : ""
        }
        maxLength={control.maxLength}
        placeholder={control.placeholder}
        onChange={(event) =>
          onChange(
            control.type === "date"
              ? toIsoDateTime(event.target.value)
              : event.target.value
          )
        }
        className={control.type === "color" ? "h-10 p-1" : undefined}
      />
    </FieldShell>
  )
}

function FieldShell({
  id,
  control,
  value,
  children,
}: {
  id: string
  control: ToolControl
  value?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{control.label}</Label>
        {value !== undefined && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {value}
          </span>
        )}
      </div>
      {children}
      {control.description && (
        <p className="text-xs leading-5 text-muted-foreground">
          {control.description}
        </p>
      )}
    </div>
  )
}

function NumberListControl({
  id,
  control,
  value,
  onChange,
}: {
  id: string
  control: Extract<ToolControl, { type: "number-list" }>
  value: SerializableValue[]
  onChange: (value: SerializableValue) => void
}) {
  const serialized = value.join(", ")
  const [draft, setDraft] = React.useState(serialized)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => setDraft(serialized), [serialized])

  return (
    <FieldShell id={id} control={control}>
      <Input
        id={id}
        inputMode="numeric"
        value={draft}
        placeholder="320, 640, 1280"
        onChange={(event) => setDraft(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onBlur={() => {
          const numbers = [
            ...new Set(
              draft
                .split(/[\s,]+/)
                .filter(Boolean)
                .map(Number)
                .filter((number) => Number.isFinite(number) && number > 0)
            ),
          ]
          if (numbers.length < (control.minItems ?? 0)) {
            setError(
              `Enter at least ${control.minItems} value${control.minItems === 1 ? "" : "s"}.`
            )
            return
          }
          if (numbers.length > (control.maxItems ?? Number.POSITIVE_INFINITY)) {
            setError(`Enter at most ${control.maxItems} values.`)
            return
          }
          onChange(numbers)
          setDraft(numbers.join(", "))
          setError(null)
        }}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </FieldShell>
  )
}

export function matchesCondition(
  values: OptionValues,
  condition?: ToolControl["visibleWhen"]
): boolean {
  if (!condition) return true
  const current = getValueAtPath(values, condition.path)
  if (condition.oneOf) {
    return condition.oneOf.some((candidate) => candidate === current)
  }
  return current === condition.equals
}

export function getValueAtPath(
  value: OptionValues,
  path: string
): SerializableValue | undefined {
  let current: SerializableValue | undefined = value
  for (const key of path.split(".")) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined
    }
    current = current[key]
  }
  return current
}

export function setValueAtPath(
  value: OptionValues,
  path: string,
  next: SerializableValue
): OptionValues {
  const keys = path.split(".")
  const output = structuredClone(value)
  let current: Record<string, SerializableValue> = output

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = next
      return
    }
    const child = current[key]
    if (!child || typeof child !== "object" || Array.isArray(child)) {
      current[key] = {}
    }
    current = current[key] as Record<string, SerializableValue>
  })

  return output
}

export function toIsoDateTime(value: string): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

export function toLocalDateTimeValue(value: string): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
