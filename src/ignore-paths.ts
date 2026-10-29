/** Match only explicitly supplied RFC 6901 JSON Pointers. */
export function prepareIgnorePaths(value: unknown): ReadonlySet<string> {
  if (value === undefined) return new Set<string>();
  if (!Array.isArray(value)) throw new TypeError("ignorePaths must be an array");
  const paths = new Set<string>();
  for (const path of value) {
    if (typeof path !== "string" || (path !== "" && !path.startsWith("/")) || /~(?![01])/.test(path)) {
      throw new TypeError("ignorePaths contains an invalid RFC 6901 JSON Pointer");
    }
    if (paths.has(path)) throw new TypeError("ignorePaths contains duplicate JSON Pointers");
    paths.add(path);
  }
  return paths;
}
export function isIgnored(path: string, ignores: ReadonlySet<string>): boolean {
  for (const rule of ignores) {
    if (rule === "" || path === rule || path.startsWith(rule + "/")) return true;
  }
  return false;
}
