/** Keep structured data valid JSON while preventing HTML script-tag termination. */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
