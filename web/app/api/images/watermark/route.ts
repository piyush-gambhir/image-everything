import { watermark } from "@/lib/images/engine"
import { parseImageRequest } from "@/lib/images/parse-form"
import { errorResponse, imageResponse } from "@/lib/images/response"
import { watermarkOptionsSchema } from "@/lib/images/schemas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { buffer, options, filename } = await parseImageRequest(
      request,
      watermarkOptionsSchema
    )
    const result = await watermark(buffer, options)
    return imageResponse(result, filename)
  } catch (error) {
    return errorResponse(error)
  }
}
