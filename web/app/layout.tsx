import type { Metadata } from "next"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { env } from "@/env"

import "./globals.css"

const siteUrl = new URL(env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Image Everything — every image tool in one place",
    template: "%s · Image Everything",
  },
  description:
    "An open-source image toolkit and REST API for compression, conversion, cropping, resizing, metadata, watermarks, pipelines, and batch jobs.",
  applicationName: "Image Everything",
  authors: [{ name: "Piyush Gambhir" }],
  creator: "Piyush Gambhir",
  keywords: [
    "image compressor",
    "image converter",
    "WebP to PNG",
    "image resize API",
    "Sharp API",
    "open source image tools",
  ],
  openGraph: {
    type: "website",
    siteName: "Image Everything",
    title: "Image Everything — every image tool in one place",
    description:
      "11 visual tools and the same versioned REST API for every common image job.",
    url: siteUrl,
    images: [
      {
        url: "/og.png",
        width: 1731,
        height: 909,
        alt: "Image Everything — Every image job. One clean workspace.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Image Everything — every image tool in one place",
    description:
      "11 visual tools and the same versioned REST API for every common image job.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <SiteHeader />
                <main className="flex flex-1 flex-col">{children}</main>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
