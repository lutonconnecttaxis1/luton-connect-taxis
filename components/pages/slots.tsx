import { Fragment, type ReactNode } from "react";

/**
 * Fills {name} holes in a translated sentence with React nodes (links, mostly), so the
 * word order can follow each language: fillSlots("Call {phone} or {wa}.", { phone: <a/>, wa: <a/> }).
 * Dependency-free: usable in server and client components.
 */
export function fillSlots(text: string, slots: Record<string, ReactNode>): ReactNode[] {
  return text.split(/\{(\w+)\}/g).map((part, i) =>
    i % 2 === 1 ? <Fragment key={i}>{slots[part] ?? `{${part}}`}</Fragment> : <Fragment key={i}>{part}</Fragment>,
  );
}
