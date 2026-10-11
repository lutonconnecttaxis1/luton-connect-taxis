import { images, type Photo } from "@/config/images";

/**
 * Everything we do – drives the homepage "Where to?" index AND the in-depth pages at
 * /services/[slug]. DRAFT COPY: written from the brief, to be checked by the client
 * (no prices, guarantees or licence claims are made here).
 *
 * Only structure lives here (slug, number, photo). ALL text is in the messages under
 * `services.items.<slug>.*`: name, meta, title, lead, statement, includes (list),
 * faqs (list of { q, a }).
 */
export type Service = {
  slug: string;
  n: string;
  photo: Photo;
};

export const services: readonly Service[] = [
  { slug: "airport-transfers", n: "01", photo: images.heathrow },
  { slug: "wedding-transfers", n: "02", photo: images.wedding },
  { slug: "courier-services", n: "03", photo: images.courier },
  { slug: "local-trips", n: "04", photo: images.taxi },
  { slug: "long-distance-national-journeys", n: "05", photo: images.motorway },
  { slug: "corporate-accounts", n: "06", photo: images.business },
  { slug: "other-journeys", n: "07", photo: images.luggage },
] as const;

export const getService = (slug: string) => services.find((s) => s.slug === slug);

/** The text of one service, from the messages. */
export type ServiceText = {
  name: string;
  meta: string;
  title: string;
  lead: string;
  statement: string;
  includes: string[];
  faqs: { q: string; a: string }[];
};
