import DOMPurify from "dompurify";

// Preview untrusted documents without scripts, styles or implicit network requests.
export function sanitizePreview(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      "img",
      "video",
      "audio",
      "iframe",
      "style",
      "link",
      "meta",
      "form",
      "input",
      "object",
      "embed",
      "source",
    ],
    FORBID_ATTR: ["style", "src", "srcset", "poster", "background", "ping"],
  });
}
