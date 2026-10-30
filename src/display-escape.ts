/** Escape controls for human-readable output without double-escaping JSON text. */
export function escapeDisplayControls(text: string): string {
  return text.replace(
    /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g,
    (character) => {
      switch (character) {
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\t": return "\\t";
        default:
          return "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0");
      }
    },
  );
}
