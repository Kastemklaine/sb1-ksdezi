// Outlook helpers: open a pre-filled Outlook compose window.
//
// Uses the Outlook-on-the-web deeplink (works for Microsoft 365 / Outlook web
// users) and falls back to a standard mailto: link, which opens the desktop
// Outlook app (or whatever default mail client the user has) pre-filled.

export function htmlToPlainText(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  // Preserve line breaks for block elements
  tmp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  tmp.querySelectorAll('p, div, li, h1, h2, h3, tr').forEach(el => el.append('\n'));
  return (tmp.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

interface Compose {
  to?: string;
  subject?: string;
  body?: string; // plain text
}

/** Open Outlook (web) with a pre-filled message, mailto fallback. */
export function composeInOutlook({ to = '', subject = '', body = '' }: Compose): void {
  const url =
    'https://outlook.office.com/mail/deeplink/compose?' +
    `to=${encodeURIComponent(to)}` +
    `&subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  // If the popup was blocked, fall back to mailto on the current window.
  if (!win) {
    window.location.href =
      `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}
