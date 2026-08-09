import { type NextRequest, NextResponse } from "next/server"

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/og.png", request.url), 307)
}
