import DOMPurify from 'dompurify';

// Centralized HTML sanitizer for any content rendered via dangerouslySetInnerHTML.
// Protects against stored XSS from rich-text documents, messages and imported
// Word files, while preserving the formatting the editors produce.
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html ?? '', {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
  });
}
