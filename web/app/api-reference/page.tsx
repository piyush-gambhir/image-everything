import type { Metadata } from "next"
import {
  ArrowUpRight,
  Braces,
  FileImage,
  Gauge,
  ShieldCheck,
  Terminal,
} from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { env } from "@/env"
import { PUBLIC_API_KEY_NOTICE } from "@/lib/api"
import { TOOL_MANIFEST } from "@/lib/tools/manifest"
import type { ToolDefinition } from "@/lib/tools/types"

export const metadata: Metadata = {
  title: "API Reference",
  description:
    "Use the Image Everything REST API to compress, resize, convert, crop, enhance, and batch-process images.",
}

const API_ORIGIN = (env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(
  /\/$/,
  ""
)

const QUICKSTART = `curl -X POST ${API_ORIGIN}/api/v2/images/convert \\
  -F file=@photo.webp \\
  -F 'options={"format":"png"}' \\
  --output photo.png`

export const API_ENDPOINTS = TOOL_MANIFEST.flatMap((tool: ToolDefinition) => [
  {
    key: tool.id,
    endpoint: tool.endpoint,
    description: tool.description,
    inputKind: tool.inputKind,
    resultKind: tool.resultKind,
  },
  ...(tool.auxiliaryResult
    ? [
        {
          key: `${tool.id}-auxiliary`,
          endpoint: tool.auxiliaryResult.endpoint,
          description: `${tool.auxiliaryResult.label} for ${tool.shortTitle.toLowerCase()}.`,
          inputKind: tool.inputKind,
          resultKind: tool.auxiliaryResult.kind,
        },
      ]
    : []),
])

export default function ApiReferencePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-7 lg:px-9 lg:py-10">
      <header className="max-w-3xl">
        <Badge className="gap-1.5 bg-brand-soft text-brand hover:bg-brand-soft">
          <Braces className="size-3" />
          REST API · v2
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          The same image engine, from your code.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          Every tool in the UI maps to a stable multipart endpoint. Upload an
          image, pass JSON options, and stream the processed file back—no SDK or
          third-party image service required.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <a href={`${API_ORIGIN}/api/docs`} target="_blank" rel="noreferrer">
              Open interactive docs <ArrowUpRight />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href="https://github.com/piyush-gambhir/image-everything"
              target="_blank"
              rel="noreferrer"
            >
              View source <ArrowUpRight />
            </a>
          </Button>
        </div>
      </header>

      <section
        className="mt-9 grid gap-3 sm:grid-cols-3"
        aria-label="API facts"
      >
        <Fact
          icon={FileImage}
          title="Multipart in"
          detail="A file field plus optional JSON-encoded options."
        />
        <Fact
          icon={Terminal}
          title="Binary out"
          detail="Images stream directly back; batch jobs return ZIP files."
        />
        <Fact
          icon={ShieldCheck}
          title="Your deployment"
          detail="Processing stays inside the API instance you control."
        />
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="quickstart-heading">
            <SectionHeading
              eyebrow="Quickstart"
              id="quickstart-heading"
              title="Convert WebP to PNG"
              description="The options field is a JSON string because the request is multipart/form-data."
            />
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral-950 p-5 text-[13px] leading-6 text-neutral-100 shadow-sm">
              <code>{QUICKSTART}</code>
            </pre>
          </section>

          <section aria-labelledby="endpoints-heading">
            <SectionHeading
              eyebrow="Operations"
              id="endpoints-heading"
              title="Image endpoints"
              description="All 29 endpoints for 28 UI tools derive from the same v2 manifest. Legacy v1 routes remain compatibility adapters."
            />
            <div className="mt-4 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
              {API_ENDPOINTS.map((operation, index) => (
                <div
                  key={operation.key}
                  className="grid gap-1 px-4 py-3.5 sm:grid-cols-[12rem_1fr] sm:gap-4 sm:px-5"
                  style={
                    index === 0
                      ? undefined
                      : { borderTop: "1px solid var(--border)" }
                  }
                >
                  <code className="text-xs font-semibold text-brand">
                    {operation.endpoint}
                  </code>
                  <div>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {operation.description}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {operation.inputKind} input · {operation.resultKind}{" "}
                      result
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="contract-heading">
            <SectionHeading
              eyebrow="Contract"
              id="contract-heading"
              title="Requests and responses"
              description="Single-image operations share one predictable transport contract."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ContractCard
                title="Request fields"
                items={[
                  "file — the source image (required)",
                  "options — JSON encoded as a string",
                  "overlay — second image for image watermarks",
                  "other — second image used by compare and difference",
                  "files — repeated field used by collage and batch",
                ]}
              />
              <ContractCard
                title="Response headers"
                items={[
                  "X-Output-Format",
                  "X-Output-Width / X-Output-Height",
                  "X-Output-Size",
                  "Content-Disposition download filename",
                ]}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl bg-surface-1 p-5">
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-brand" />
              <h2 className="text-sm font-semibold">Runtime limits</h2>
            </div>
            <dl className="mt-4 space-y-3 text-xs">
              <Limit label="File size" value="25 MB" />
              <Limit label="Batch size" value="20 images" />
              <Limit label="Pipeline steps" value="20 operations" />
              <Limit label="Default rate" value="120 / minute" />
            </dl>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Query <code>/api/v2/capabilities</code> for the limits and codecs
              advertised by the running deployment.
            </p>
          </div>
          <div className="rounded-2xl bg-surface-1 p-5">
            <h2 className="text-sm font-semibold">Optional authentication</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              When the server has <code>API_KEY</code> configured, send it as a
              bearer token.
            </p>
            <code className="mt-3 block overflow-x-auto rounded-lg bg-background px-3 py-2 text-[11px]">
              Authorization: Bearer $API_KEY
            </code>
            <p className="mt-3 text-xs leading-5 text-warning">
              {PUBLIC_API_KEY_NOTICE}
            </p>
          </div>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/">← Back to all tools</Link>
          </Button>
        </aside>
      </div>
    </div>
  )
}

function Fact({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof FileImage
  title: string
  detail: string
}) {
  return (
    <div className="rounded-2xl bg-surface-1 p-4">
      <Icon className="size-4 text-brand" />
      <h2 className="mt-3 text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  id,
  title,
  description,
}: {
  eyebrow: string
  id: string
  title: string
  description: string
}) {
  return (
    <header>
      <p className="text-[10px] font-semibold tracking-[0.12em] text-brand uppercase">
        {eyebrow}
      </p>
      <h2 id={id} className="mt-1 text-xl font-semibold">
        {title}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </header>
  )
}

function ContractCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/8">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-brand" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
