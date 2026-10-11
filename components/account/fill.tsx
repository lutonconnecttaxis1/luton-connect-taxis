import { Fragment, type ReactNode } from "react";

/**
 * Puts React nodes (links, bold text) into a translated sentence at its {name} slots, so word order can
 * differ per language: fill("Agree to the {terms} and {privacy}.", { terms: <Link/>, privacy: <Link/> }).
 * A slot the text does not mention is skipped; an unknown {name} is left as written.
 */
export function fill(text: string, slots: Record<string, ReactNode>): ReactNode {
  return text.split(/\{(\w+)\}/g).map((part, i) =>
    i % 2 === 1 ? (
      <Fragment key={i}>{part in slots ? slots[part] : `{${part}}`}</Fragment>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
