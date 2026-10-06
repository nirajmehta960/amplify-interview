/**
 * A stand-in page module for route tests. Imported inside `vi.mock` factories
 * (which are hoisted above the test file's own top-level code).
 */
export function fakePage(name: string) {
  return { default: () => <p>{name} page</p> };
}
