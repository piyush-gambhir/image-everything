import fs from "fs"
import path from "path"


export function getFilesByExtension(dir: string, extension = ".mdx"): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory ${dir} does not exist`)
  }
  return fs.readdirSync(dir).filter((file) => path.extname(file) === extension)
}


export function readFileContent(
  filePath: string,
  encoding: BufferEncoding = "utf-8"
): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File ${filePath} does not exist`)
  }
  return fs.readFileSync(filePath, encoding)
}


export function getSlugFromFile(filePath: string): string {
  return path.basename(filePath, path.extname(filePath))
}


export function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}
