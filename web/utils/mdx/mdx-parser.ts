export function mdxParser(fileContent: string): {
  metadata: Record<string, string>;
  content: string;
} {
  const frontmatterRegex = /---\s*([\s\S]*?)\s*---/;
  const match = frontmatterRegex.exec(fileContent);

  if (!match) {
    return { metadata: {}, content: fileContent.trim() };
  }

  const frontMatterBlock = match[1];
  const content = fileContent.replace(frontmatterRegex, '').trim();
  const frontMatterLines = frontMatterBlock.trim().split('\n');

  const metadata = frontMatterLines.reduce<Record<string, string>>((meta, line) => {
    const [key, ...valueArr] = line.split(': ');
    let value = valueArr.join(': ').trim();
    value = value.replace(/^['"](.*)['"]$/, '$1');
    meta[key.trim()] = value;
    return meta;
  }, {});

  return { metadata, content };
}
