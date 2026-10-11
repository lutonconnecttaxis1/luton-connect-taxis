/**
 * TEMPORARY stock photography for the template stage.
 *
 * Source: Pexels (free for commercial use, no attribution required) – hot-linked.
 * Photos were chosen from search-result titles and have NOT been individually reviewed,
 * so swap any that don't look right.
 *
 * BEFORE LAUNCH replace these with the client's own photos of their real vehicles
 * (LEVC TX e, Mercedes Vito 114 Hackney), drivers and partner hotels, saved in
 * /public/images and optimised. Change a picture by editing its pexels id/`src` below –
 * no component changes are needed. Alt texts are translated: see messages `images.<id>`.
 */
const pexels = (id: number, width = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

export type Photo = {
  /**
   * Key of the photo in `images` below. Its (translated) alt text lives in the messages at
   * `images.<id>`; components look it up with `photoAlt(t, photo)` (or let <Bg locale=…> do it).
   */
  id: string;
  src: string;
};

const photo = (id: string, pexelsId: number, width?: number): Photo => ({
  id,
  src: pexels(pexelsId, width),
});

/** Translated alt text of a photo: t("images.<id>"). Pass the `t` from getT(locale) / useT(). */
export const photoAlt = (t: (key: string) => string, image: Photo): string => t(`images.${image.id}`);

export const images = {
  hero: photo("hero", 13203013, 2400),

  // Fleet – stand-ins until the client supplies photos of the real vehicles
  taxi: photo("taxi", 15525797, 1800),
  vito: photo("vito", 17792319, 1800),

  // Atmosphere
  nightCab: photo("nightCab", 16364038, 2000),

  // Airport routes (shown on hover)
  heathrow: photo("heathrow", 3580, 900),
  gatwick: photo("gatwick", 4983510, 900),
  stansted: photo("stansted", 13471768, 900),
  londonCity: photo("londonCity", 10537847, 900),
  london: photo("london", 19585983, 900),
  luton: photo("luton", 35150092, 900),

  // Service pages
  wedding: photo("wedding", 8231468, 1600),
  courier: photo("courier", 6869065, 1600),
  motorway: photo("motorway", 4527219, 1800),
  business: photo("business", 8052844, 1600),
  luggage: photo("luggage", 15535499, 1600),

  // Hotels
  hotelAirport: photo("hotelAirport", 9788991, 1000),
  hotelTown: photo("hotelTown", 10902408, 1000),
  hotelBusiness: photo("hotelBusiness", 18426842, 1000),
  hotelBoutique: photo("hotelBoutique", 695193, 1000),
  hotelLate: photo("hotelLate", 4223678, 1000),
} as const;
