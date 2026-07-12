/**
 * Minimal, dependency-free markdown renderer for chat messages.
 *
 * Renders the common subset LLMs emit — headings, bold/italic, inline code, fenced code blocks,
 * ordered/unordered lists, blockquotes, links, and paragraphs — by building React elements
 * (never `dangerouslySetInnerHTML`), so there is no HTML-injection surface. Links are restricted
 * to http(s)/mailto/relative URLs; anything else renders as plain text.
 *
 * Buyers who want full CommonMark/GFM (tables, task lists, footnotes) can swap this component for
 * a library like `react-markdown` — it is deliberately isolated so that is a one-file change.
 */
import type { ReactNode } from "react";

type Block =
  | { kind: "code"; lang: string; content: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "p"; text: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Fenced code block.
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const lang = fence[1]?.trim() ?? "";
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      i += 1; // skip closing fence
      blocks.push({ kind: "code", lang, content: body.join("\n") });
      continue;
    }

    // Blank line — skip.
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Heading.
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1]!.length,
        text: heading[2]!.trim(),
      });
      i += 1;
      continue;
    }

    // Blockquote (one or more consecutive `>` lines).
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith(">")) {
        quote.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ kind: "quote", text: quote.join(" ") });
      continue;
    }

    // Lists (bulleted or ordered).
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i] ?? "";
        const m = isOrdered
          ? current.match(/^\s*\d+\.\s+(.*)$/)
          : current.match(/^\s*[-*]\s+(.*)$/);
        if (!m) break;
        items.push(m[1]!);
        i += 1;
      }
      blocks.push({ kind: "list", ordered: isOrdered, items });
      continue;
    }

    // Paragraph — gather until a blank line or a block starter.
    const para: string[] = [];
    while (i < lines.length) {
      const current = lines[i] ?? "";
      if (
        current.trim() === "" ||
        current.startsWith("```") ||
        current.match(/^#{1,6}\s+/) ||
        current.startsWith(">") ||
        current.match(/^\s*[-*]\s+/) ||
        current.match(/^\s*\d+\.\s+/)
      ) {
        break;
      }
      para.push(current);
      i += 1;
    }
    blocks.push({ kind: "p", text: para.join(" ") });
  }

  return blocks;
}

/** Only allow safe link targets; everything else is rendered as text. */
function safeHref(href: string): string | null {
  const trimmed = href.trim();
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
}

const INLINE_RE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(\*[^*]+\*)|(_[^_]+_)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${n}`;
    n += 1;

    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-surface-strong px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const label = linkMatch?.[1] ?? token;
      const href = linkMatch ? safeHref(linkMatch[2]!) : null;
      if (href) {
        nodes.push(
          <a
            key={key}
            href={href}
            className="text-accent underline underline-offset-2"
          >
            {label}
          </a>,
        );
      } else {
        nodes.push(label);
      }
    } else if (token.startsWith("*") || token.startsWith("_")) {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        switch (block.kind) {
          case "code":
            return (
              <pre
                key={key}
                className="overflow-x-auto rounded-md border border-border bg-surface-strong p-3 text-xs"
              >
                <code className="font-mono text-foreground">{block.content}</code>
              </pre>
            );
          case "heading": {
            const size =
              block.level <= 1
                ? "text-lg"
                : block.level === 2
                  ? "text-base"
                  : "text-sm";
            return (
              <p key={key} className={`font-semibold text-foreground ${size}`}>
                {renderInline(block.text, key)}
              </p>
            );
          }
          case "list":
            return block.ordered ? (
              <ol key={key} className="list-decimal space-y-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={key} className="list-disc space-y-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    {renderInline(item, `${key}-${itemIndex}`)}
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote
                key={key}
                className="border-l-2 border-border pl-3 italic"
              >
                {renderInline(block.text, key)}
              </blockquote>
            );
          case "p":
            return (
              <p key={key} className="whitespace-pre-wrap">
                {renderInline(block.text, key)}
              </p>
            );
        }
      })}
    </div>
  );
}
