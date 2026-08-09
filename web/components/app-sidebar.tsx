"use client"

import { BookOpen, GitFork, Images } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { FEATURES } from "@/lib/features"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const pathname = usePathname()
  const isHome = pathname === "/"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild isActive={isHome}>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Images className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">image-everything</span>
                  <span className="text-xs text-muted-foreground">
                    tools for any image
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {FEATURES.map((feature) => {
                const href = `/${feature.slug}`
                const isActive =
                  pathname === href || pathname?.startsWith(`${href}/`)
                const Icon = feature.icon
                return (
                  <SidebarMenuItem key={feature.slug}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={feature.title}
                    >
                      <Link href={href}>
                        <Icon className="size-4" />
                        <span>{feature.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {feature.status === "coming-soon" && (
                      <SidebarMenuBadge className="text-muted-foreground">
                        soon
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
        <div className="px-2 py-1 text-xs text-muted-foreground">
          press <kbd className="rounded bg-muted px-1">d</kbd> for dark
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
