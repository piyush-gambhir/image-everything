import fs from 'fs';
import path from 'path';

// Get files from a directory by a specific extension
export function getFilesByExtension(dir: string, extension = '.mdx'): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory ${dir} does not exist`);
  }
  return fs.readdirSync(dir).filter((file) => path.extname(file) === extension);
}

// Read file content with a default encoding (e.g., 'utf-8')
export function readFileContent(filePath: string, encoding: BufferEncoding = 'utf-8'): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File ${filePath} does not exist`);
  }
  return fs.readFileSync(filePath, encoding);
}

// Get the slug from a file (filename without extension)
export function getSlugFromFile(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

// Function to dynamically create directory if it doesn't exist
export function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
