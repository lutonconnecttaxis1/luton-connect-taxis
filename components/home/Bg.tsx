import { photoAlt, type Photo } from "@/config/images";
import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";

type BgProps = {
  photo: Photo;
  className?: string;
} & (
  | { decorative: true; locale?: Locale }
  /** Meaningful photos need the page language so the alt text (messages `images.<id>`) can be translated. */
  | { decorative?: false; locale: Locale }
);

/**
 * A photo drawn as a CSS background so a failed/blocked image URL falls back to a
 * dark gradient instead of a broken-image icon. Meaningful photos get role="img";
 * decorative ones pass `decorative`.
 */
export function Bg({ photo, className = "", decorative = false, locale }: BgProps) {
  const label = decorative || !locale ? undefined : photoAlt(getT(locale), photo);
  return (
    <div
      className={`photo ${className}`.trim()}
      role={decorative ? undefined : "img"}
      aria-label={label}
      aria-hidden={decorative ? true : undefined}
      style={{
        backgroundImage: `url("${photo.src}"), linear-gradient(135deg, #222c37, #10161d)`,
      }}
    />
  );
}
