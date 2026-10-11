/**
 * Airport geofences – a pickup or drop-off whose coordinates fall inside the
 * circle counts as "at" that airport, and the matching fee from
 * config/airport-fees.ts is added. `id` must match an id in airport-fees.ts.
 *
 * Centres are approximate terminal-area coordinates; radii are generous enough to
 * cover terminals, drop-off zones and on-site hotels. Check on a map before launch.
 */
export type AirportSite = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
};

export const airportSites: AirportSite[] = [
  { id: "heathrow", name: "London Heathrow", lat: 51.47, lng: -0.4543, radiusKm: 3.2 },
  { id: "gatwick", name: "London Gatwick", lat: 51.1537, lng: -0.1821, radiusKm: 2.4 },
  { id: "luton", name: "London Luton", lat: 51.8747, lng: -0.3683, radiusKm: 2.0 },
  { id: "stansted", name: "London Stansted", lat: 51.886, lng: 0.2389, radiusKm: 2.4 },
  { id: "london-city", name: "London City", lat: 51.5053, lng: 0.0553, radiusKm: 1.5 },
  { id: "manchester", name: "Manchester", lat: 53.3537, lng: -2.275, radiusKm: 2.6 },
  { id: "birmingham", name: "Birmingham", lat: 52.4539, lng: -1.748, radiusKm: 2.0 },
  { id: "edinburgh", name: "Edinburgh", lat: 55.95, lng: -3.3725, radiusKm: 2.2 },
  { id: "bristol", name: "Bristol", lat: 51.3827, lng: -2.7191, radiusKm: 1.8 },
  { id: "east-midlands", name: "East Midlands", lat: 52.8311, lng: -1.3281, radiusKm: 2.2 },
  { id: "glasgow", name: "Glasgow", lat: 55.8642, lng: -4.4331, radiusKm: 2.0 },
];
