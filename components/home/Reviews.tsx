import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { reviews as realReviews, sampleReviews, type Review } from "@/content/reviews";

/** Made-up sample reviews are only ever shown while developing locally, never in a production build. */
const showSamples = process.env.NODE_ENV !== "production";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="rev__stars" role="img" aria-label={`${rating} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" data-on={i < rating ? "" : undefined}>
          <path d="M10 1.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.8l5.9-.8L10 1.6z" />
        </svg>
      ))}
    </span>
  );
}

function ReviewCard({ review, sourceLabel, copy = false }: { review: Review; sourceLabel: string; copy?: boolean }) {
  return (
    <li className="rev__card" aria-hidden={copy ? true : undefined}>
      <span className="rev__quote" aria-hidden="true">
        “
      </span>
      <p className="rev__text">{review.text}</p>
      <div className="rev__who">
        <span className="rev__avatar" aria-hidden="true">
          {review.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="rev__id">
          <a href={review.url} target="_blank" rel="noopener noreferrer" className="rev__name" tabIndex={copy ? -1 : undefined}>
            {review.name}
          </a>
          <span className="rev__src">{sourceLabel}</span>
        </div>
        <Stars rating={review.rating} />
      </div>
    </li>
  );
}

/**
 * Homepage reviews. With no reviews in `content/reviews.ts` it shows the placeholder.
 * With reviews it shows an auto-scrolling strip (right to left) that pauses on hover/focus;
 * for visitors who prefer reduced motion it becomes a normal swipeable row.
 */
export function Reviews({ locale }: { locale: Locale }) {
  const t = getT(locale);
  const isSample = realReviews.length === 0 && showSamples;
  const reviews = realReviews.length > 0 ? realReviews : isSample ? sampleReviews : [];

  if (reviews.length === 0) {
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

  const source = t(isSample ? "home.reviews.sourceSample" : "home.reviews.source");
  return (
    <section className="sec sec--light reviews reviews--strip" id="reviews" aria-labelledby="reviews-title">
      <div className="container reviews__head">
        <p className="eyebrow">
          {t("home.reviews.eyebrow")}
        </p>
        <h2 id="reviews-title" className="display">
          {t("home.reviews.title")}
        </h2>
      </div>

      <div className="rev" tabIndex={0} aria-label={t("home.reviews.title")}>
        <ul className="rev__track">
          {reviews.map((r) => (
            <ReviewCard key={r.url + r.name} review={r} sourceLabel={source} />
          ))}
          {/* a second copy makes the loop seamless; hidden from assistive technology */}
          {reviews.map((r) => (
            <ReviewCard key={`copy-${r.url}${r.name}`} review={r} sourceLabel={source} copy />
          ))}
        </ul>
      </div>

      <p className="rev__note">{t(isSample ? "home.reviews.footnoteSample" : "home.reviews.footnote")}</p>
    </section>
  );
}
