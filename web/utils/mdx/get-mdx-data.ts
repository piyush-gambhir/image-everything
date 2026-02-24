import path from 'path';
import { getFilesByExtension, getSlugFromFile, readFileContent } from '@/utils/files';
import { mdxParser } from '@/utils/mdx/mdx-parser';

export function parseMDXFrontmatter(fileContent: string) {
  return mdxParser(fileContent);
}

export function getMDXData(
  filePath: string,
  readFileContentFn: (filePath: string) => string = readFileContent,
) {
  const fileContent = readFileContentFn(filePath);
  const { metadata, content } = parseMDXFrontmatter(fileContent);
  const slug = getSlugFromFile(filePath);

  return {
    slug,
    metadata,
    content,
  };
}

export function getMDXPages(directory: string) {
  const pages = getFilesByExtension(directory, '.mdx');
  return pages.map((fileName) => {
    const filePath = path.join(directory, fileName);
    return getMDXData(filePath);
  });
}

export function getMDXPage(slug: string, directory = 'markdown-pages') {
  const pages = getMDXPages(directory);
  return pages.find((page) => page.slug === slug);
}

export function getMDXPagePaths(directory = 'markdown-pages') {
  return getMDXPages(directory).map((page) => ({
    params: {
      slug: page.slug,
    },
  }));
}
