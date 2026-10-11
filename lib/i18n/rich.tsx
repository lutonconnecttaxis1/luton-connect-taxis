import { Fragment, type ReactNode } from "react";

type TagRenderers = Record<string, (children: string, key: number) => ReactNode>;

/** Tags allowed inside message text. <mark> is the green highlight used in headings. */
const defaultTags: TagRenderers = {
  mark: (children, key) => (
    <span className="mark" key={key}>
      {children}
    </span>
  ),
  strong: (children, key) => <strong key={key}>{children}</strong>,
  b: (children, key) => <strong key={key}>{children}</strong>,
  em: (children, key) => <em key={key}>{children}</em>,
};

/**
 * Turns "Taxis you can <mark>trust</mark>" into React nodes. Only the tags above are
 * understood (no nesting, no attributes); anything else is shown as plain text, so a
 * translation can never inject markup.
 */
export function rich(text: string, tags: TagRenderers = defaultTags): ReactNode {
  const re = /<(\w+)>([^<]*)<\/\1>/g;
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(re)) {
    const render = tags[match[1]];
    if (!render) continue;
    if (match.index > last) out.push(<Fragment key={`t${i}`}>{text.slice(last, match.index)}</Fragment>);
    out.push(render(match[2], i));
    last = match.index + match[0].length;
    i += 1;
  }
  if (last < text.length) out.push(<Fragment key={`t${i}`}>{text.slice(last)}</Fragment>);
  return out;
}

/** The same text with the tags removed (for titles, aria-labels and meta descriptions). */
export function stripTags(text: string): string {
  return text.replace(/<\/?(mark|strong|b|em)>/g, "");
}
