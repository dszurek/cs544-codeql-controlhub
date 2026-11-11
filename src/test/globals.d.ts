// Makes Vitest's `globals: true` API (describe/it/expect/vi/...) visible to
// `tsc --noEmit`. Referenced here rather than via tsconfig's `types` array so
// the default @types auto-inclusion (node, react) stays intact.
/// <reference types="vitest/globals" />
