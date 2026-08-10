/**
 * Build-time bridge for a clean workspace before pnpm has linked workspace
 * packages into backend/node_modules. Runtime imports remain the public package
 * name; declarations still come from the package's generated contract output.
 */
declare module "@image-everything/contracts" {
  export * from "@image-everything/contracts-types";
}
