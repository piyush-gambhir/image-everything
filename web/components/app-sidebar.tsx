"use client"

import { BookOpen, GitFork, Images, Search } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

import { Input } from "@/components/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { CATEGORY_META, TOOL_MANIFEST } from "@/lib/tools/manifest"
import { TOOL_ICON_REGISTRY } from "@/lib/tools/registry"
import { TOOL_CATEGORIES } from "@/lib/tools/types"

export function AppSidebar() {
  const pathname = usePathname()
  const [query, setQuery] = React.useState("")
  const normalized = query.trim().toLowerCase()
  const filtered = normalized
    ? TOOL_MANIFEST.filter((tool) =>
        [tool.title, tool.shortTitle, tool.description, ...tool.keywords]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      )
    : TOOL_MANIFEST

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild isActive={pathname === "/"}>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Images className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Image Everything</span>
                  <span className="text-xs text-muted-foreground">
                    28 still-image tools
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="relative group-data-[collapsible=icon]:hidden">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a tool…"
            aria-label="Search sidebar tools"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {TOOL_CATEGORIES.map((category) => {
          const tools = filtered.filter((tool) => tool.category === category)
          if (tools.length === 0) return null
          return (
            <SidebarGroup key={category}>
              <SidebarGroupLabel>
                {CATEGORY_META[category].label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {tools.map((tool) => {
                    const href = `/${tool.slug}`
                    const isActive =
                      pathname === href || pathname?.startsWith(`${href}/`)
                    const Icon = TOOL_ICON_REGISTRY[tool.id]
                    return (
                      <SidebarMenuItem key={tool.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={tool.shortTitle}
                        >
                          <Link href={href}>
                            <Icon className="size-4" />
                            <span>{tool.shortTitle}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            No tools match “{query}”.
          </p>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/api-reference"}
              tooltip="API Reference"
            >
              <Link href="/api-reference">
                <BookOpen className="size-4" />
                <span>API Reference</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="GitHub">
              <a
                href="https://github.com/piyush-gambhir/image-everything"
                target="_blank"
                rel="noreferrer"
              >
                <GitFork className="size-4" />
                <span>GitHub</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
