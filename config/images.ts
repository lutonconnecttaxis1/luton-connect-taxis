/**
 * The website's pictures. The files live in /public/images (optimised WebP copies of the
 * client's own photos; the full-size originals are kept in /_original-pictures, which is not
 * committed). To change a picture, replace the file or edit its `src` below – no component
 * changes are needed. Alt texts are translated: see messages `images.<id>`.
 */
export type Photo = {
  /**
   * Key of the photo in `images` below. Its (translated) alt text lives in the messages at
   * `images.<id>`; components look it up with `photoAlt(t, photo)` (or let <Bg locale=…> do it).
   */
  id: string;
  src: string;
};

const photo = (id: string, src: string): Photo => ({ id, src });

/** Translated alt text of a photo: t("images.<id>"). Pass the `t` from getT(locale) / useT(). */
export const photoAlt = (t: (key: string) => string, image: Photo): string => t(`images.${image.id}`);

export const images = {
  // Homepage and page banners
  hero: photo("hero", "/images/hero/hero-section-bg.webp"),

  // Fleet
  taxi: photo("taxi", "/images/fleet/levc-tx-e.webp"),
  vito: photo("vito", "/images/fleet/mercedes-vito-114.webp"),
  weddingCars: photo("weddingCars", "/images/fleet/wedding-cars.webp"),

  // Services ("Where to?")
  airportTransfers: photo("airportTransfers", "/images/services/airport-transfers.webp"),
  weddingTransfers: photo("weddingTransfers", "/images/services/wedding-transfers.webp"),
  courierServices: photo("courierServices", "/images/services/courier-services.webp"),
  localTrips: photo("localTrips", "/images/services/local-trips.webp"),
  longDistance: photo("longDistance", "/images/services/long-distance-journeys.webp"),
  corporate: photo("corporate", "/images/services/corporate-accounts.webp"),
  otherJourneys: photo("otherJourneys", "/images/services/other-journeys.webp"),

  // Hotels
  hotelHolidayInn: photo("hotelHolidayInn", "/images/hotels/holiday-inn-express.webp"),
  hotelTravelodge: photo("hotelTravelodge", "/images/hotels/travelodge.webp"),
  hotelChiltern: photo("hotelChiltern", "/images/hotels/chiltern.webp"),
  hotelStockwood: photo("hotelStockwood", "/images/hotels/stockwood.webp"),
  hotelLinton: photo("hotelLinton", "/images/hotels/linton.webp"),
  hotelLutonHoo: photo("hotelLutonHoo", "/images/hotels/luton-hoo.webp"),
  hotelCity: photo("hotelCity", "/images/hotels/city-hotel.webp"),
  hotelThistle: photo("hotelThistle", "/images/hotels/thistle-express.webp"),
} as const;
