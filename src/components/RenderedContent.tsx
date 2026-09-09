import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";

/*
  Renders stored theory-question HTML.

  This is the ONLY place stored HTML reaches the DOM, so it is also the only
  place sanitization has to happen. Two stages:

    1. DOMPurify strips everything outside a small allowlist. Math survives as
       the bare <span data-type="inline-math" data-latex="..."> that TipTap
       emits -- no KaTeX markup is trusted from the database.
    2. KaTeX then renders each of those spans locally. The visible math markup
       is therefore always generated here at render time, never read from the
       stored string.

  Used by the editor's live preview and by the theory question list, so what
  an admin previews is produced by exactly the same path as what is displayed.
*/

const ALLOWED_TAGS = [
  "p", "br",
  "strong", "b", "em", "i", "u", "s",
  "code", "pre",
  "ul", "ol", "li",
  "sub", "sup",
  "span",
];

/*
  ALLOW_DATA_ATTR is off, so data-* survives only by being named here. That
  keeps the math hooks working without opening up data-* generally.
*/
const ALLOWED_ATTR = ["data-type", "data-latex"];

export function sanitizeContentHtml(html?: string | null) {
  return DOMPurify.sanitize(String(html || ""), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/* Plain-text fallback, for callers that need a preview without a DOM node. */
export function contentHtmlToText(html?: string | null) {
  const el = document.createElement("div");
  el.innerHTML = sanitizeContentHtml(html);

  el.querySelectorAll<HTMLElement>("[data-latex]").forEach((node) => {
    node.textContent = node.getAttribute("data-latex") || "";
  });

  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

type RenderedContentProps = {
  html?: string | null;
  className?: string;
};

export default function RenderedContent({
  html,
  className = "",
}: RenderedContentProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) return;

    host.innerHTML = sanitizeContentHtml(html);

    host.querySelectorAll<HTMLElement>("[data-latex]").forEach((node) => {
      const latex = node.getAttribute("data-latex") || "";
      const displayMode = node.getAttribute("data-type") === "block-math";

      try {
        katex.render(latex, node, {
          displayMode,
          throwOnError: false,
          /*
            trust:false is the KaTeX default and is what blocks \href,
            \includegraphics and friends. Stated explicitly because this
            renders content that will later be shown to students.
          */
          trust: false,
        });
      } catch {
        /* Malformed LaTeX shows as its source rather than breaking the page. */
        node.textContent = latex;
      }
    });
  }, [html]);

  return (
    <div
      ref={hostRef}
      className={`rendered-content text-sm font-semibold leading-7 text-slate-600 dark:text-slate-200 ${className}`}
    />
  );
}
