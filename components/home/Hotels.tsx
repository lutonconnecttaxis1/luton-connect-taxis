import type { Locale } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/messages";
import { hotels } from "./data";
import { Bg } from "./Bg";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

/** Hotel journeys as flip cards: the hotel's name on the front; guide price and a short description on the back. */
export function Hotels({ locale }: { locale: Locale }) {
  const t = getT(locale);
  return (
    <section className="sec sec--light hotels" id="hotels">
      <div className="container hotels__head">
        <div>
          <p className="eyebrow" data-reveal>
            {t("home.hotels.eyebrow")}
          </p>
          <h2 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>
            {t("home.hotels.titleLine1")}
            <br />
            {t("home.hotels.titleLine2")}
          </h2>
        </div>
        <div className="arrows" data-reveal>
          <button type="button" aria-label={t("home.hotels.previous")} data-scroll-target="#hotel-scroller" data-scroll-dir="-1">
            <ChevronLeftIcon />
          </button>
          <button type="button" aria-label={t("home.hotels.next")} data-scroll-target="#hotel-scroller" data-scroll-dir="1">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="hscroll" id="hotel-scroller" tabIndex={0} aria-label={t("home.hotels.scrollerLabel")}>
        {hotels.map((hotel) => (
          <article key={hotel.id} className="hotel" tabIndex={0} data-reveal="clip">
            <div className="hotel__flip">
              <div className="hotel__inner">
                <div className="hotel__face hotel__front">
                  <Bg photo={hotel.photo} decorative />
                  <div className="hotel__cap">
                    <h3 className="hotel__name">{hotel.name}</h3>
                    <p className="hotel__hint">{t("home.hotels.flipHint")}</p>
                  </div>
                </div>
                <div className="hotel__face hotel__back">
                  <p className="hotel__route">{t("home.hotels.fareRoute", { hotel: hotel.name })}</p>
                  <p className="hotel__price">
                    {"from" in hotel && hotel.from ? t("home.hotels.fareFrom", { price: hotel.price }) : hotel.price}
                  </p>
                  <p className="hotel__desc">{t(`home.hotels.items.${hotel.id}.desc`)}</p>
                  <p className="hotel__note">{t("home.hotels.faresNote")}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
