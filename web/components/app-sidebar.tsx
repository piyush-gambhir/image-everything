"use client"

import { ImageDown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  featuresByCategory,
} from "@/lib/features"

export function AppSidebar() {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const grouped = featuresByCategory()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild isActive={isHome}>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-foreground to-foreground/70 text-background shadow-sm">
                  <ImageDown className="size-4" />
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
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat]
          if (items.length === 0) return null
          return (
            <SidebarGroup key={cat}>
              <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase">
                {CATEGORY_LABELS[cat]}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((feature) => {
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
          )
        })}
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
          press{" "}
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">
            d
          </kbd>{" "}
          for dark
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
