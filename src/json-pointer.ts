/**
 * Append one object-key or array-index segment to a JSON Pointer.
 *
 * RFC 6901 requires escaping "~" before "/", so the resulting segments are
 * reversible. Other characters (including dots, spaces, brackets, and quotes)
 * remain unchanged. Keep this helper internal to the comparison engine.
 */
export function appendPointerSegment(parentPath: string, segment: string): string {
  const escapedSegment = segment.replace(/~/g, "~0").split("/").join("~1");
  return parentPath + "/" + escapedSegment;
}
