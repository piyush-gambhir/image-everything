import { z } from "zod"

import { ACCEPTED_INPUT_MIMES } from "@/lib/images/types"

export const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024

export class ImageRequestError extends Error {
  status: number
  issues?: z.ZodIssue[]

  constructor(message: string, status: number, issues?: z.ZodIssue[]) {
    super(message)
    this.name = "ImageRequestError"
    this.status = status
    this.issues = issues
  }
}

export type ParsedImageRequest<TOptions> = {
  buffer: Buffer
  mime: string
  filename: string
  options: TOptions
}

export async function parseImageRequest<TSchema extends z.ZodTypeAny>(
  request: Request,
  optionsSchema?: TSchema,
  maxFileSize: number = DEFAULT_MAX_FILE_SIZE
): Promise<ParsedImageRequest<z.infer<TSchema>>> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    throw new ImageRequestError("Expected multipart/form-data request", 415)
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    throw new ImageRequestError('Missing "file" field in request', 400)
  }

  if (file.size === 0) {
    throw new ImageRequestError("Uploaded file is empty", 400)
  }

  if (file.size > maxFileSize) {
    throw new ImageRequestError(
      `File too large (${file.size} bytes, max ${maxFileSize})`,
      413
    )
  }

  if (!ACCEPTED_INPUT_MIMES.includes(file.type)) {
    throw new ImageRequestError(
      `Unsupported file type: ${file.type || "unknown"}`,
      415
    )
  }

  let options: z.infer<TSchema> = {} as z.infer<TSchema>
  if (optionsSchema) {
    const rawOptions = formData.get("options")
    let parsedOptions: unknown = {}
    if (typeof rawOptions === "string" && rawOptions.length > 0) {
      try {
        parsedOptions = JSON.parse(rawOptions)
      } catch {
        throw new ImageRequestError('Invalid JSON in "options" field', 400)
      }
    }
    const result = optionsSchema.safeParse(parsedOptions)
    if (!result.success) {
      throw new ImageRequestError("Invalid options", 400, result.error.issues)
    }
    options = result.data
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  return {
    buffer,
    mime: file.type,
    filename: file.name || "image",
    options,
  }
}
