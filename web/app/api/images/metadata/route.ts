import { readMetadata } from "@/lib/images/metadata"
import { parseImageRequest } from "@/lib/images/parse-form"
import { errorResponse } from "@/lib/images/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { buffer } = await parseImageRequest(request)
    const metadata = await readMetadata(buffer)
    return Response.json(metadata, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
