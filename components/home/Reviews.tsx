import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";

/** Placeholder – replace with real reviews supplied by the client or pulled from Google. */
export function Reviews({ locale }: { locale: Locale }) {
  const t = getT(locale);
  return (
    <section className="sec sec--light reviews" id="reviews">
      <div className="container reviews__in">
        <span className="reviews__mark" aria-hidden="true">
          “
        </span>
        <blockquote data-reveal>
          <p>{t("home.reviews.quote")}</p>
          <footer>
            <span className="reviews__tag">{t("home.reviews.tag")}</span> {t("home.reviews.note")}
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
