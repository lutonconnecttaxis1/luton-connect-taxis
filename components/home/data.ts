/**
 * Static data for the homepage sections. Only ids, numbers and photos live here –
 * every visible word is in the messages (namespace `home`, `header`), looked up by id.
 */
import { images } from "@/config/images";

/** `key` maps to the message `header.nav.<key>`. */
export const navLinks = [
  { href: "/#services", key: "services" },
  { href: "/fleet", key: "fleet" },
  { href: "/#hotels", key: "hotels" },
  { href: "/#connections", key: "connections" },
  { href: "/blog", key: "blog" },
  { href: "/contact", key: "contact" },
] as const;

/** "How booking works": texts are `home.steps.<key>.title` / `.text`. */
export const steps = [
  { n: "01", key: "journey" },
  { n: "02", key: "confirm" },
  { n: "03", key: "ride" },
] as const;

/**
 * Vehicles: `name` is a proper noun and stays here. Texts are `home.fleet.items.<id>.kicker`,
 * `.text` and `.specs` (a list of { term, desc }).
 */
export const fleet = [
  { n: "01", id: "levc", name: "LEVC TX e", photo: images.taxi },
  { n: "02", id: "vito", name: "Mercedes Vito 114", photo: images.vito },
] as const;

/** Texts are `home.features.<key>.title` / `.text`. */
export const features = [
  { key: "tracking" },
  { key: "greet" },
  { key: "access" },
  { key: "card" },
  { key: "corporate" },
  { key: "executive" },
  { key: "business" },
] as const;

/**
 * Popular hotel journeys from Luton – shown as flip cards (name on the front; price and a short
 * description on the back). Prices are guides, not fixed prices.
 * `name` is a proper noun and stays as written; the description is `home.hotels.items.<id>.desc`.
 * `from: true` shows the price as `home.hotels.fareFrom` ("From {price}").
 * Photos are temporary stand-ins (`config/images.ts`) – replace with the hotels' own pictures.
 */
export const hotels = [
  { id: "holidayInn", name: "Holiday Inn Express", price: "£20.00", photo: images.hotelAirport },
  { id: "travelodge", name: "Travelodge Luton", price: "£27.00–£30.00", photo: images.hotelLate },
  { id: "chiltern", name: "Chiltern Hotel", price: "£27.00–£30.00", photo: images.hotelBusiness },
  { id: "stockwood", name: "Stockwood Hotel", price: "£22.00", from: true, photo: images.hotelBoutique },
  { id: "linton", name: "Linton Hotel", price: "£22.00", from: true, photo: images.hotelTown },
  { id: "lutonHoo", name: "Luton Hoo", price: "£25.00–£30.00", photo: images.hotelTown },
  { id: "cityHotel", name: "City Hotel", price: "£25.00", from: true, photo: images.hotelBusiness },
  { id: "thistleExpress", name: "Thistle Express", price: "£25.00", from: true, photo: images.hotelAirport },
] as const;

/** Texts are `home.connections.items.<key>.title` / `.text`. */
export const connections = [
  { key: "train" },
  { key: "plane" },
  { key: "bus" },
  { key: "shopping" },
] as const;
