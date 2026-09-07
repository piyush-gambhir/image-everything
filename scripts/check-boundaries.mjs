#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(
  new URL("../backend/package.json", import.meta.url),
);
const ts = require("typescript");
const violations = [];
const nativePackages = new Set([
  "sharp",
  "exifr",
  "heic-decode",
  "libheif-js",
  "archiver",
  "canvas",
  "jimp",
  "gm",
  "imagemagick",
]);
const surfaces = [
  { name: "backend", sources: ["backend/src"] },
  {
    name: "web",
    sources: ["web/app", "web/components", "web/hooks", "web/lib"],
  },
  {
    name: "packages/image-contracts",
    sources: ["packages/image-contracts/src"],
  },
];

function packageName(specifier) {
  return specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
}

function imports(source) {
  const specifiers = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      specifiers.push(node.argument.literal.text);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

async function sourceFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    if (["node_modules", "__tests__", "dist", ".next"].includes(entry.name))
      continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(filename)));
    else if (
      /\.[cm]?[jt]sx?$/.test(entry.name) &&
      !/\.(test|spec)\./.test(entry.name)
    )
      files.push(filename);
  }
  return files;
}

for (const surface of surfaces) {
  const manifestPath = `${surface.name}/package.json`;
  const manifest = JSON.parse(
    await readFile(path.join(root, manifestPath), "utf8"),
  );
  for (const field of [
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    for (const dependency of Object.keys(manifest[field] ?? {})) {
      if (
        nativePackages.has(dependency) ||
        dependency === "@image-everything/image-worker"
      ) {
        violations.push(
          `${manifestPath}: ${dependency} belongs only to a worker runtime (${field}).`,
        );
      }
    }
  }
  for (const directory of surface.sources) {
    for (const filename of await sourceFiles(path.join(root, directory))) {
      const source = ts.createSourceFile(
        filename,
        await readFile(filename, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      for (const specifier of imports(source)) {
        const dependency = packageName(specifier);
        const importedPath = specifier.startsWith(".")
          ? path.relative(root, path.resolve(path.dirname(filename), specifier))
          : specifier;
        const importsWorker =
          dependency === "@image-everything/image-worker" ||
          importedPath.startsWith("workers/");
        const importsOtherApplication =
          (surface.name === "web" && importedPath.startsWith("backend/")) ||
          (surface.name === "backend" && importedPath.startsWith("web/")) ||
          (surface.name === "packages/image-contracts" &&
            /^(?:backend|web)\//.test(importedPath));
        if (
          nativePackages.has(dependency) ||
          importsWorker ||
          importsOtherApplication
        ) {
          violations.push(
            `${path.relative(root, filename)}: forbidden import ${JSON.stringify(specifier)}; use the shared contract and HTTP worker boundary.`,
          );
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    "Architecture boundaries verified: native image execution stays in workers.",
  );
}
