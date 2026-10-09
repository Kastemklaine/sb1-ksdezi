// Word (.docx / .doc) interoperability helpers.
//
// Export: wraps the document's HTML in a minimal Word-compatible HTML envelope
// and downloads it as a .doc file. Microsoft Word (and Outlook) open this
// natively with full formatting — no heavy dependency, works in every browser.
//
// Import: uses `mammoth` (loaded on demand) to convert an uploaded .docx into
// clean HTML that drops straight into the rich-text editor.

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Download the given HTML content as a Word-compatible document. */
export function exportHtmlToWord(title: string, bodyHtml: string): void {
  const safeTitle = (title || 'document').trim() || 'document';
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(safeTitle)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.5; }
  h1 { font-size: 20pt; color: #00844e; } h2 { font-size: 15pt; color: #00844e; } h3 { font-size: 13pt; }
  table { border-collapse: collapse; } td, th { border: 1px solid #999; padding: 4px 8px; }
  img { max-width: 100%; }
</style>
</head>
<body>
<h1>${escapeHtml(safeTitle)}</h1>
${bodyHtml || '<p></p>'}
</body>
</html>`;

  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeTitle.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 80) || 'document'}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Convert an uploaded Word (.docx) file to HTML for the editor. */
export async function importWordToHtml(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value || '';
}
