"use client"

import { BookOpen, GitFork } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { getFeature } from "@/lib/features"

export function SiteHeader() {
  const pathname = usePathname() ?? "/"
  const segments = pathname.split("/").filter(Boolean)
  const currentSlug = segments[0]
  const feature = currentSlug ? getFeature(currentSlug) : undefined
  const onHome = !currentSlug
  const currentTitle =
    currentSlug === "api-reference"
      ? "API Reference"
      : (feature?.title ?? currentSlug)

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="data-[orientation=vertical]:h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          {onHome ? (
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          ) : (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{currentTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
          <Link href="/api-reference">
            <BookOpen /> API
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="hidden sm:inline-flex"
        >
          <a
            href="https://github.com/piyush-gambhir/image-everything"
            target="_blank"
            rel="noreferrer"
            aria-label="Image Everything on GitHub"
          >
            <GitFork />
          </a>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
