/**
 * Customer reviews shown in the homepage carousel.
 *
 * ONLY add real reviews here: copy the wording exactly as the customer wrote it on the
 * Google Business Profile (or as they sent it to the business) and link to the review/profile it
 * came from. Never write or edit a review for somebody. While this list is empty the
 * homepage shows the "real reviews will appear here" placeholder instead of the carousel.
 *
 * Reviews are shown in the language the customer wrote them in (they are not translated).
 * Avoid the long dash (–) in the text; use a normal hyphen or rewrite the sentence.
 */
export type Review = {
  /** Name as shown on Google, e.g. "Sam Taylor" */
  name: string;
  /** Link to the reviewer's Google Maps profile or to the review itself */
  url: string;
  /** Stars, 1 to 5 */
  rating: 1 | 2 | 3 | 4 | 5;
  /** The review text, exactly as written */
  text: string;
};

export const reviews: readonly Review[] = [
  {
    name: "Bernard Coward",
    url: "https://www.google.com/maps/search/?api=1&query=Luton+Connect+Taxis+Luton",
    rating: 5,
    text: "I needed a corrected receipt for a journey from Luton Airport to Stevenage 27 August 26 . When I phoned up the person I spoke to was so helpful and advised me what to do . I did as requested and received my corrected receipt within 10 minutes . Absolutely brilliant service Thank you",
  },
  {
    name: "Charlie Adams",
    url: "https://www.google.com/maps/search/?api=1&query=Luton+Connect+Taxis+Luton",
    rating: 5,
    text: "VERY GOOD SERVICE",
  },
  {
    name: "Benas Bizas",
    url: "https://www.google.com/maps/search/?api=1&query=Luton+Connect+Taxis+Luton",
    rating: 5,
    text: "Impressive driving skills by our driver. Recommend 10/10",
  },
  {
    name: "Claire Mc Gowan",
    url: "https://www.google.com/maps/search/?api=1&query=Luton+Connect+Taxis+Luton",
    rating: 5,
    text: "Fantastic service, really friendly driver. Highly recommended",
  },
  {
    name: "Trade Finance",
    url: "https://www.google.com/maps/search/?api=1&query=Luton+Connect+Taxis+Luton",
    rating: 5,
    text: "Good driver, he checked our flight time and traffic conditions and proposed to start our trip earlier. Thanks and thanks!",
  },
  {
    name: "Sam Mccaffrey",
    url: "https://www.google.com/maps/search/?api=1&query=Luton+Connect+Taxis+Luton",
    rating: 5,
    text: "Brilliant cab drivers at Luton airport, cant do enough for you. Travelling with a disabled passenger with lots of bags and a huge hoist, they helped us so much, thank you so much!",
  },
  {
    name: "Silvia Andrew",
    url: "https://www.google.com/maps/search/?api=1&query=Luton+Connect+Taxis+Luton",
    rating: 5,
    text: "I regularly book Luton Connect Taxis found through work reception at Leonardo Capability Green for trips to Luton Station, and they are always completely reliable and on time. Today, I used them for a personal early morning trip (3:00 AM) to Luton Airport with my elderly mum who uses a wheelchair. Traveling with a wheelchair, luggage, and an elderly passenger is challenging, but the driver went completely out of their way to help us. Exceptional wheelchair accessible taxi service and airport tranfers in Luton - highly recommend!",
  },
  {
    name: "Caroline Hooper",
    url: "https://www.google.com/maps/search/?api=1&query=Luton+Connect+Taxis+Luton",
    rating: 5,
    text: "After a long day due to cancellations at Luton airport we was delighted to get cab 016 Aqib to look after us! Great customer service, plenty of smiles and a comfortable ride. Thank you for making a stressful 24 hours easier",
  },
  {
    name: "Ayaz Hussain",
    url: "https://www.google.com/maps/search/?api=1&query=Luton+Connect+Taxis+Luton",
    rating: 5,
    text: "After uber cancelled on me 6 times at luton airport at 3am luton connect come to the rescue.",
  },
  {
    name: "Jit Samji",
    url: "https://www.google.com/maps/search/?api=1&query=Luton+Connect+Taxis+Luton",
    rating: 5,
    text: "We booked 5 person cab. Great service, very flexible. Will use again",
  },
];

/**
 * SAMPLE reviews so the carousel can be seen and styled while developing.
 *
 * These are MADE UP (invented names and wording), so they are NOT real customer feedback.
 * They are only shown when the site runs locally (`npm run dev`), always labelled "Sample review",
 * and never in a production build (Vercel), where the placeholder is shown until real reviews are
 * added above. Do not copy them into `reviews`.
 */
export const sampleReviews: readonly Review[] = [
  { name: "Alex M.", url: "#", rating: 5, text: "The driver was waiting for us when we landed and helped with all of our bags. Easy and calm from start to finish." },
  { name: "Jordan P.", url: "#", rating: 5, text: "Booked online in two minutes and the estimate was clear. The car was spotless and arrived right on time." },
  { name: "Sam T.", url: "#", rating: 5, text: "Very friendly driver who knew the best way into town. We would happily use them again for the airport run." },
  { name: "Chris L.", url: "#", rating: 4, text: "Good service and a comfortable ride. Plenty of space for four people and a lot of luggage." },
  { name: "Taylor R.", url: "#", rating: 5, text: "We used them for a wedding morning. The cars looked lovely and everything ran to plan." },
  { name: "Morgan K.", url: "#", rating: 5, text: "Quick to answer on WhatsApp and the driver tracked our delayed flight without us having to ask." },
  { name: "Casey D.", url: "#", rating: 5, text: "Reliable early morning pick up. Polite, careful driving and a fair price for the journey." },
  { name: "Jamie H.", url: "#", rating: 4, text: "Smooth trip to the hotel after a long flight. The driver was patient and easy to talk to." },
  { name: "Riley B.", url: "#", rating: 5, text: "We need a taxi we can count on for work trips, and this has been exactly that so far." },
  { name: "Drew S.", url: "#", rating: 5, text: "Spacious accessible taxi and a driver who took real care. Made a stressful day much easier." },
];
