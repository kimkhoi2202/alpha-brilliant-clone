import katex from "katex";
import type { ReactNode } from "react";

/** One inline math segment delimited by single dollar signs: `$...$`. */
const INLINE_MATH = /\$([^$]+)\$/g;

/** Typeset a single LaTeX fragment to a KaTeX span. */
function renderSegment(latex: string, key: number, displayMode: boolean): ReactNode {
  // KaTeX renders the markup itself from the LaTeX source (it's not arbitrary
  // user HTML), so injecting its output is the supported way to mount it.
  // `throwOnError: false` makes a malformed formula degrade to readable source
  // instead of crashing the lesson.
  const html = katex.renderToString(latex, { throwOnError: false, displayMode });
  return <span key={key} dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Render text that may embed inline math. Splits on `$...$` and typesets each
 * delimited segment with KaTeX (so `$\sqrt{x}$` gets a real radical with a
 * vinculum over the whole radicand), leaving the surrounding prose as plain
 * text. Strings without a `$` are returned unchanged, so it's safe to route all
 * lesson/quiz copy through it.
 */
export function renderMathText(text: string): ReactNode {
  if (!text.includes("$")) return text;

  const out: ReactNode[] = [];
  // A fresh regex per call keeps the stateful `lastIndex` cursor local.
  const re = new RegExp(INLINE_MATH);
  let cursor = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) out.push(text.slice(cursor, match.index));
    out.push(renderSegment(match[1], key++, false));
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}
