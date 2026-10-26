import { Fragment } from "react";
import { Link } from "@/components/i18n/Link";
import { linkKind, parseInline } from "@/lib/blog-inline";

/** Renders article text: [label](href) links and **bold** (format described in lib/blog-inline.ts). */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((token, i) => {
        if (token.kind === "text") return <Fragment key={i}>{token.text}</Fragment>;
        if (token.kind === "bold") return <strong key={i}>{token.text}</strong>;
        const kind = linkKind(token.href);
        if (kind === "internal") {
          return (
            <Link key={i} href={token.href}>
              {token.text}
            </Link>
          );
        }
        if (kind === "contact") {
          return (
            <a key={i} href={token.href}>
              {token.text}
            </a>
          );
        }
        return (
          <a key={i} href={token.href} target="_blank" rel="noopener noreferrer">
            {token.text}
          </a>
        );
      })}
    </>
  );
}
