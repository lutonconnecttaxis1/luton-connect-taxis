"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localeHref } from "@/lib/i18n/config";
import { useLocale } from "./I18nProvider";

/**
 * Drop-in replacement for next/link that keeps the visitor in their language:
 * <Link href="/fleet"> goes to /fleet, /ro/fleet, /zh/fleet … External links,
 * tel:, mailto: and #hash links are left alone.
 */
export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  const target = typeof href === "string" ? localeHref(locale, href) : href;
  return <NextLink href={target} {...props} />;
}
