import { images, type Photo } from "@/config/images";

/**
 * Blog articles, in English. The other languages live in content/blog-i18n/<locale>.ts with the
 * same structure (same headings, lists and link addresses); lib/blog-i18n.ts picks the right one.
 * When you change an English article, change its translations too – lib/blog.test.ts fails if
 * their structure drifts apart.
 *
 * Text rules
 *  - Inline links use [label](href). Internal links start with "/" (e.g. /services/local-trips,
 *    /#quote, /blog/some-slug); the language prefix is added automatically. tel:, mailto: and
 *    https:// links work too. **double stars** make bold text.
 *  - Only say things that are true for Luton Connect Taxis (see the site's own pages): prices are
 *    estimates, you pay the driver in the car (card accepted), flights are monitored, meet and
 *    greet, wheelchair-accessible LEVC taxis. No licence numbers, fixed prices or waiting-time
 *    figures until the client supplies them.
 *  - Facts about other organisations (Luton Airport charges, passenger rights) are dated and link to
 *    the official page, because they change. Re-check them when you update an article.
 */

export type Block =
  | { t: "p"; x: string }
  | { t: "h2"; x: string }
  | { t: "h3"; x: string }
  | { t: "ul"; x: string[] }
  | { t: "ol"; x: string[] }
  /** A highlighted tip or reminder. */
  | { t: "note"; x: string };

export type BlogPost = {
  /** Web address: /blog/<slug>. Keep it short, lower case, words joined by hyphens. */
  slug: string;
  title: string;
  /** Search-result description, 110–160 characters. */
  description: string;
  /** Short line shown on the blog index card. */
  excerpt: string;
  /** YYYY-MM-DD */
  published: string;
  /** YYYY-MM-DD – set when the article is revised. */
  updated?: string;
  photo: Photo;
  /** Slugs of two or three related articles shown at the bottom. */
  related: string[];
  blocks: Block[];
};

/** The words of an article that get translated (everything else, such as dates, photo and related links, is shared). */
export type PostText = Pick<BlogPost, "title" | "description" | "excerpt" | "blocks">;

const CALL = "[01582 353158](tel:+441582353158)";
const WHATSAPP = "[WhatsApp](https://wa.me/441582353158)";
const EMAIL = "[admin@lutonconnecttaxis.com](mailto:admin@lutonconnecttaxis.com)";

const nightTravel: BlogPost = {
  slug: "night-time-taxi-luton",
  title: "Why a Taxi Is the Smartest Way to Get Home at Night in Luton",
  description:
    "Late shifts, last trains and dark streets: here is why a pre-booked taxi beats the night bus, a long walk or a surge-priced app when you travel after dark in Luton.",
  excerpt: "Late shifts, early flights and last trains: why a pre-booked taxi takes the stress out of travelling after dark.",
  published: "2026-10-26",
  photo: images.localTrips,
  related: ["airport-transfers-from-luton-guide", "flight-delayed-airport-taxi-rights"],
  blocks: [
    {
      t: "p",
      x: "Travelling at night in Luton and the surrounding towns comes with its own set of problems. Buses thin out after the evening rush, the last trains leave earlier than most people expect, and a walk that feels perfectly fine at 6pm can feel very different at 1am in the rain. If you are finishing a late shift, coming home from an event or setting off for an early flight, a taxi is usually the simplest answer. Here is why, and how to make a night-time booking go smoothly.",
    },
    { t: "h2", x: "Public transport runs out when you need it most" },
    {
      t: "p",
      x: "Night buses are infrequent, many routes stop altogether late in the evening, and the last train home can leave well before a concert, match or shift has finished. Miss it and you are left on a cold platform, or working out an expensive alternative at the last minute. A taxi works to your timetable instead of the other way round: you choose the pickup time, and the driver takes you from where you are to where you are going, with no changes and no waiting around in the dark.",
    },
    {
      t: "p",
      x: "Our [local trips](/services/local-trips) service covers Luton and the nearby towns at any hour, and a higher night rate applies between 11pm and 6am, which your online estimate takes into account.",
    },
    { t: "h2", x: "Door to door means less time outside" },
    {
      t: "p",
      x: "The riskiest part of a late journey is often the bit either side of the vehicle: the walk to the stop, the wait for the connection, the walk home from the station. A taxi removes almost all of it.",
    },
    {
      t: "ul",
      x: [
        "You are collected from your door, your workplace, a venue or a hotel, not from a bus stop.",
        "You are dropped at the exact address, so there is no walking down poorly lit streets.",
        "There is no waiting at exposed stops or stations, which matters most if you are alone, carrying luggage or travelling with children.",
      ],
    },
    {
      t: "p",
      x: "That is why shift workers, students and anyone coming home from a night out so often choose a taxi for the last leg of the journey.",
    },
    { t: "h2", x: "The British weather does not help" },
    {
      t: "p",
      x: "Rain, fog, frost and icy pavements all make walking, cycling and waiting at a stop more unpleasant and more risky after dark. A taxi keeps you warm and dry from the moment you get in, and a driver who knows the local roads can pick the safest, quickest route when conditions are poor. Our fleet includes the purpose-built electric [LEVC TX e taxi](/fleet), with step-free ramp access and plenty of luggage space, so getting in and out is easy whatever the weather.",
    },
    { t: "h2", x: "A local firm instead of a surge-priced app" },
    {
      t: "p",
      x: "Ride-hailing apps are convenient, but at night prices can jump without warning and a driver can cancel just when you are counting on the car. Booking with a local taxi firm is more predictable. You can send a request for exactly the time you need, you get an estimate before you commit, and a real person answers if you call, message us on " +
        WHATSAPP +
        " or email. When your driver arrives, you simply pay in the car, by card if you prefer.",
    },
    {
      t: "note",
      x: "Estimates are not fixed prices. We confirm your quote by WhatsApp, phone or email once you send a booking request.",
    },
    { t: "h2", x: "Sharing the ride is safer and cheaper" },
    {
      t: "p",
      x: "Two, three or even six people in one taxi usually costs less per person than separate bus fares or several individual rides, and travelling together is reassuring on a late-night journey. If you are heading out as a group, tell us how many of you there are when you book. Our Mercedes Vito 114 is the best fit for a party of five or six with bags.",
    },
    { t: "h2", x: "Six tips for a smooth night-time journey" },
    {
      t: "ol",
      x: [
        "Book ahead when you know your finish time, especially on busy nights such as Fridays, Saturdays and bank-holiday weekends.",
        "Give an exact pickup point: the venue entrance, the hotel door or a full postcode, so the driver does not have to search for you.",
        "Let a friend or family member know your pickup time and where you are going. Our confirmation message gives you the details to share.",
        "Before you get in, check that the vehicle and driver match the details in your booking confirmation.",
        "Keep your phone charged so we can reach you, or you can reach us, if plans change.",
        "Heading to the airport? Add your flight number when you book so we can keep an eye on it.",
      ],
    },
    { t: "h2", x: "Early flights from Luton Airport" },
    {
      t: "p",
      x: "Night-time travel is not only about getting home. Many Luton Airport flights leave at dawn, long before buses and trains are running their normal timetable. A pre-booked [airport transfer](/services/airport-transfers) means your taxi is outside when you are ready, with space for your luggage and none of the stress of wondering how you will reach the terminal. Our [guide to airport transfers from Luton](/blog/airport-transfers-from-luton-guide) explains how booking works.",
    },
    { t: "h2", x: "Book your night-time taxi" },
    {
      t: "p",
      x: "Get an instant estimate with our [booking form](/#quote), call us on " +
        CALL +
        ", message us on " +
        WHATSAPP +
        " or email " +
        EMAIL +
        ". We will confirm your journey and make sure your ride is ready when you need it.",
    },
  ],
};

const firstTimers: BlogPost = {
  slug: "luton-airport-taxi-guide-first-time-visitors",
  title: "Luton Airport Taxi Guide for First-Time Visitors to the UK",
  description:
    "Black cabs, private hire, taxi ranks and airport fees explained. Everything a first-time visitor needs to know before taking a taxi from London Luton Airport.",
  excerpt: "Black cabs, private hire, taxi ranks and airport fees explained for anyone arriving at Luton for the first time.",
  published: "2026-10-26",
  photo: images.airportTransfers,
  related: ["arriving-at-luton-airport-taxi-rank", "airport-transfers-from-luton-guide", "taxi-to-luton-airport-from-luton-areas"],
  blocks: [
    {
      t: "p",
      x: "Taxis work a little differently in the UK from many other countries, and the first time can feel confusing. There are two kinds of taxi, different places to find them, and sometimes extra fees on top of the fare. If you are landing at London Luton Airport, a few minutes of reading now can save you time and money when you arrive.",
    },
    { t: "h2", x: "Black cabs and private hire cars: what is the difference?" },
    {
      t: "p",
      x: "You will meet two main types of taxi in the UK. **Black cabs** (the traditional London-style taxis) can be taken from a taxi rank or hailed in the street, and they are metered. **Private hire vehicles**, often called minicabs, must be booked in advance and usually come with a price agreed beforehand.",
    },
    {
      t: "p",
      x: "Both are normal, safe ways to travel when they are properly licensed. Our own taxis are the same style of vehicle you would see on a London rank: the purpose-built electric LEVC TX e and the roomier Mercedes Vito 114. The difference is that you book them ahead of time, so there is no queue and no guesswork. You can see both on our [fleet page](/fleet).",
    },
    { t: "h2", x: "How taxis work at Luton Airport" },
    {
      t: "p",
      x: "At the time of writing (October 2026), London Luton Airport's own taxi information says the black cab rank is just past Bus Bay A, near the terminal, where a marshal sends you to the next available cab. Pre-booked taxis meet you at the airport's Pick Up Zone or at a meeting point you have agreed with your driver. Details can change, so check the airport's [official taxi page](https://www.london-luton.co.uk/to-and-from-lla/taxi) before you travel.",
    },
    {
      t: "p",
      x: "If you book with us, you do not have to hunt for a rank at all. Your driver meets you when you land and we confirm the meeting point with you in advance. Read more about our [airport transfers](/services/airport-transfers).",
    },
    { t: "h2", x: "Airport charges and your fare" },
    {
      t: "p",
      x: "Airports charge taxi drivers to use their drop-off and pick-up areas. At the time of writing, Luton's drop-off and pick-up zone costs £7 for the first 10 minutes and £1 for each minute after that, according to the airport. Airport fees are usually passed on in the fare. When you ask us for an estimate, any airport fee is shown as its own line, so you can see exactly what makes up the total.",
    },
    {
      t: "note",
      x: "Our online estimate is an estimate, not a fixed price. We confirm your quote by WhatsApp, phone or email, and you pay the driver in the car.",
    },
    { t: "h2", x: "Check before you get in" },
    {
      t: "p",
      x: "A few simple checks give you peace of mind with any taxi, anywhere in the UK:",
    },
    {
      t: "ul",
      x: [
        "Use a licensed taxi. Licensed vehicles carry a plate and display the driver's badge. Do not accept rides from people who approach you in the terminal.",
        "For a pre-booked ride, check that the driver and vehicle match your booking confirmation.",
        "Agree how you will pay and what the journey is expected to cost before you set off.",
        "Put your seatbelt on and keep your valuables with you.",
      ],
    },
    { t: "h2", x: "Tipping and taxi etiquette" },
    {
      t: "p",
      x: "Tipping a taxi driver is not compulsory in the UK. Many passengers round the fare up or add around 10 per cent for good service, particularly after help with heavy luggage. Drivers are happy to chat but equally happy to let you rest after a long flight. Having your destination address ready, ideally with the postcode, helps the journey start smoothly.",
    },
    { t: "h2", x: "Plan your transfer before you fly" },
    {
      t: "ul",
      x: [
        "**Pre-book.** You get a confirmed ride waiting for you, a driver who knows your flight and a clear estimate up front.",
        "**Give us your flight number.** We keep an eye on it and adjust your pickup if you land early or late.",
        "**Think about space.** Up to six passengers fit in our LEVC TX e, and the Mercedes Vito 114 is the best choice for five or six people with extra luggage. Tell us about child seats when you book.",
        "**Accessibility.** The LEVC TX e has step-free ramp access for wheelchair users.",
        "**Payment.** You pay your driver in the car, and card payments are accepted.",
      ],
    },
    { t: "h2", x: "Going into central London" },
    {
      t: "p",
      x: "Luton is an hour or more from central London by road, depending on traffic. In the daytime, the train from Luton Airport Parkway is a good, low-cost option if you are travelling light. A taxi comes into its own when you have bags, children or a group, when you arrive late at night or when you want to go straight to your hotel door. If your journey enters the Congestion Charge zone, the charge is added to your estimate. For trips beyond Luton, see our [long-distance journeys](/services/long-distance-national-journeys).",
    },
    { t: "h2", x: "Ready to book?" },
    {
      t: "p",
      x: "Get your estimate on our [booking form](/#quote), call us on " +
        CALL +
        " or message us on " +
        WHATSAPP +
        ". We will confirm the details and have your taxi ready when you arrive.",
    },
  ],
};

const delays: BlogPost = {
  slug: "flight-delayed-airport-taxi-rights",
  title: "Flight Delayed? How to Protect Your Airport Taxi and What You Are Owed",
  description:
    "Why flights get delayed, what UK passenger rights say after 2, 3 or 4 hours, and how to make sure your airport taxi is still waiting when you finally land.",
  excerpt: "What counts as a delay, what your airline owes you, and how to keep your airport taxi on track when plans change.",
  published: "2026-10-26",
  photo: images.airportTransfers,
  related: ["arriving-at-luton-airport-taxi-rank", "airport-transfers-from-luton-guide"],
  blocks: [
    {
      t: "p",
      x: "Flight delays are a fact of life for anyone who flies regularly. A late departure can turn a smooth trip into a long wait, a missed connection and a taxi that is no longer where you need it. This guide explains why flights get delayed, what UK rules say you are entitled to, and how a pre-booked [airport taxi](/services/airport-transfers) can take at least one worry off your list.",
    },
    {
      t: "note",
      x: "This is general information, not legal advice. Rules and amounts change, so always check the Civil Aviation Authority's pages before you make a claim.",
    },
    { t: "h2", x: "Why flights are delayed" },
    {
      t: "ul",
      x: [
        "**Weather:** fog, snow, ice, strong winds and storms can slow or stop departures.",
        "**Air traffic control:** congested airspace or staffing problems can hold aircraft on the ground.",
        "**Operational problems:** technical faults, crew shortages or an aircraft arriving late from its previous flight.",
        "**Airport constraints:** limited runway or terminal capacity, especially at busy times such as school holidays and Christmas.",
      ],
    },
    {
      t: "p",
      x: "You cannot control any of these, but knowing the usual causes helps you build a little slack into your plans, particularly if you are travelling at a peak time of year.",
    },
    { t: "h2", x: "What the rules say about delays" },
    {
      t: "p",
      x: "Under the UK's passenger-rights rules, as summarised by the [Civil Aviation Authority](https://www.caa.co.uk/air-passengers/travel-problems-and-rights/flight-delays-and-cancellations/delays/) at the time of writing (October 2026), your airline must look after you if your departure is delayed by at least:",
    },
    {
      t: "ul",
      x: [
        "2 hours, on flights of less than 1,500 km",
        "3 hours, on flights of 1,500 km to 3,500 km",
        "4 hours, on flights of more than 3,500 km",
      ],
    },
    {
      t: "p",
      x: "That care includes food and drink in proportion to the wait, two phone calls or emails and, if you are stuck overnight, a hotel and transport to it. You are owed this whatever caused the delay.",
    },
    {
      t: "p",
      x: "Compensation is a separate matter. If you reach your final destination more than three hours late, you may be able to claim a fixed amount from the airline, depending on the distance flown: £220 for flights under 1,500 km, £350 for 1,500 to 3,500 km and £260 or £520 for longer flights, depending on whether you arrive three to four hours late or more than four. Airlines do not have to pay if the delay was caused by extraordinary circumstances, and you must claim from the airline first. If you are delayed by five hours or more you can also choose not to travel and get a refund for the unused flight.",
    },
    { t: "h2", x: "How a delay affects your journey on the ground" },
    {
      t: "ul",
      x: [
        "**Missed connections.** A late flight can mean a missed train, coach or onward booking.",
        "**Extra costs.** Meals, a hotel and last-minute transport add up quickly.",
        "**Lost time and money.** Non-refundable hotels, events and tours do not wait for you.",
        "**Stress.** Waiting for hours, then scrambling to find a taxi at a busy terminal, is the last thing you want.",
      ],
    },
    {
      t: "p",
      x: "Keep boarding passes, receipts and notes of the delay. They make any airline or insurance claim much easier.",
    },
    { t: "h2", x: "How we handle flight delays" },
    {
      t: "p",
      x: "When you book an airport transfer with us, add your flight number. We keep an eye on your flight and adjust your pickup if you land early or late, so your driver is waiting when you arrive and you are not left hunting for a taxi rank. Because our drivers meet you at the airport, you can start your journey home or to your hotel as soon as you are through arrivals.",
    },
    {
      t: "p",
      x: "If a long delay is likely to affect your booking, tell us as soon as you know, by " +
        CALL +
        " or " +
        WHATSAPP +
        ". The earlier we hear, the better we can plan around it.",
    },
    { t: "h2", x: "Pre-booking or taking a taxi on arrival?" },
    {
      t: "p",
      x: "Taking a black cab from the rank works well if you are flexible, but you may queue after a long flight and fares are metered. A pre-booked transfer gives you a taxi arranged in advance, a driver who knows which flight you are on and an estimate before you set off. When your flight is likely to be late or at an unsocial hour, that certainty is worth a lot. Our [airport transfers guide](/blog/airport-transfers-from-luton-guide) explains the process step by step.",
    },
    { t: "h2", x: "Questions to ask any airport taxi company" },
    {
      t: "ul",
      x: [
        "Do you monitor my flight and adjust the pickup if it changes?",
        "How are delays and waiting time handled, and is there any extra charge?",
        "What is your cancellation policy if my plans change?",
        "Will the driver meet me in the arrivals area, and can they help with luggage?",
      ],
    },
    {
      t: "p",
      x: "We are happy to answer all of these before you book. Just ask by phone, WhatsApp or email.",
    },
    { t: "h2", x: "Before, during and after a delay" },
    {
      t: "ol",
      x: [
        "**Before you fly:** build in a buffer, book your transfer ahead, and check what your airline and travel insurance cover.",
        "**During the delay:** tell your taxi company about any change, keep receipts and note how long you waited.",
        "**Afterwards:** claim compensation from the airline if you qualify, send insurance claims with your paperwork and give feedback if anything fell short.",
      ],
    },
    { t: "h2", x: "Hassle-free airport travel with Luton Connect Taxis" },
    {
      t: "p",
      x: "Delays are out of your hands, but your transport does not have to be. Get an estimate on our [booking form](/#quote) or contact us on " +
        CALL +
        ", " +
        WHATSAPP +
        " or " +
        EMAIL +
        ", and leave the rest to us.",
    },
  ],
};

const arriving: BlogPost = {
  slug: "arriving-at-luton-airport-taxi-rank",
  title: "Landing at Luton Airport: Where to Find Your Taxi, Step by Step",
  description:
    "From the plane to your taxi at London Luton Airport: baggage reclaim, the taxi rank, pre-booked pickup, payment, journey times and tips to avoid delays.",
  excerpt: "A step-by-step walk from the aircraft door to your taxi, with what to expect on the way.",
  published: "2026-10-26",
  photo: images.hero,
  related: ["luton-airport-taxi-guide-first-time-visitors", "flight-delayed-airport-taxi-rights", "taxi-to-luton-airport-from-luton-areas"],
  blocks: [
    {
      t: "p",
      x: "Arriving at London Luton Airport feels different from Heathrow or Gatwick. It is a busy hub for both business and leisure travellers, but it sits a little way outside the capital, so your onward journey needs some thought. After a long flight the last thing you want is uncertainty about transport. This walk-through shows what usually happens between the aircraft door and your taxi, and how to make it quicker.",
    },
    { t: "h2", x: "Step by step: from plane to taxi" },
    { t: "h3", x: "1. Leaving the aircraft and passport control" },
    {
      t: "p",
      x: "Follow the signs to immigration and baggage reclaim. Queues move faster on some days than others, and international arrivals can take longer at busy times.",
    },
    { t: "h3", x: "2. Collecting your bags" },
    {
      t: "p",
      x: "Screens in the baggage hall show which carousel your flight is using. When several flights land close together the hall gets crowded and bags can take longer to appear, so build a little extra time into your plans.",
    },
    { t: "h3", x: "3. Walking into the arrivals hall" },
    {
      t: "p",
      x: "Once through customs you will enter the arrivals hall, where friends, family and drivers are waiting. From here there are clear signs to public transport and to the taxi areas.",
    },
    { t: "h3", x: "4. Finding your taxi" },
    {
      t: "p",
      x: "There are two ways to get a taxi at Luton. At the time of writing (October 2026), the airport says black cabs wait at the rank just past Bus Bay A, with a marshal directing you to the next car, and that pre-booked taxis meet you at the Pick Up Zone or an agreed meeting point. Check the airport's [official taxi page](https://www.london-luton.co.uk/to-and-from-lla/taxi) for the latest information.",
    },
    {
      t: "p",
      x: "If you have booked a transfer with us, your driver meets you when you arrive and we confirm exactly where beforehand. There is no queue to join and no hunting for the rank. See our [airport transfers](/services/airport-transfers) service for details.",
    },
    { t: "h2", x: "How long will you wait?" },
    {
      t: "p",
      x: "Waiting times at any taxi rank depend on how many flights have just landed. Weekday mornings and evenings tend to be busiest, while mid-afternoon and late-night arrivals are often quieter, though fewer cars on the rank can sometimes mean a wait of its own. Pre-booking removes the guesswork, because the car has been arranged for you.",
    },
    { t: "h2", x: "What affects cost and journey time" },
    {
      t: "ul",
      x: [
        "**Traffic.** Morning and evening peaks add time, especially on routes towards London.",
        "**Roadworks and incidents.** These can cause delays on the main roads.",
        "**Weather.** Heavy rain, ice or fog slow everything down.",
        "**Time of day.** A higher night rate applies between 11pm and 6am.",
        "**Airport fees and charges.** An airport fee is added when your journey starts or ends at an airport, and the Congestion Charge applies if you enter the central London zone. Both appear as separate lines in your estimate.",
      ],
    },
    { t: "h2", x: "Estimates, metered fares and paying" },
    {
      t: "p",
      x: "Black cabs on the rank charge by the meter. When you book with us, you see an estimate in advance, based on distance, time of day and any airport fees. It is not a fixed price until we confirm it with you by WhatsApp, phone or email. You pay your driver in the car, and card payments are accepted, so you do not need to change money on arrival.",
    },
    { t: "h2", x: "Accessibility and families" },
    {
      t: "p",
      x: "Our LEVC TX e taxis have step-free ramp access and plenty of room for wheelchair users and luggage. If you need a child seat, a specific vehicle or any other help, tell us when you book so the right taxi is ready. You can see both of our vehicles on the [fleet page](/fleet).",
    },
    { t: "h2", x: "Practical tips for a smooth arrival" },
    {
      t: "ul",
      x: [
        "Share the exact address and postcode of your destination, ideally copied into a map app so you can follow the route.",
        "Have your booking confirmation handy and check the driver and vehicle match it.",
        "Know what luggage you are bringing. Tell us in advance about anything oversized so there is room for it.",
        "Ignore unsolicited offers of a lift in the terminal. Stick to the official rank or your pre-booked driver.",
        "If something goes wrong, keep your confirmation and receipts and contact the taxi company straight away. The airport's information desk can also help.",
      ],
    },
    { t: "h2", x: "Where to next?" },
    {
      t: "p",
      x: "Whether you are heading to a Luton hotel, a family home or a destination further afield, we can take you door to door. See our [local trips](/services/local-trips) and [long-distance journeys](/services/long-distance-national-journeys), or get an instant estimate on the [booking form](/#quote). Prefer to talk? Call " +
        CALL +
        " or message us on " +
        WHATSAPP +
        ".",
    },
  ],
};

const areas: BlogPost = {
  slug: "taxi-to-luton-airport-from-luton-areas",
  title: "Taxi to Luton Airport From Stopsley, Leagrave, Farley Hill, Wigmore and Challney",
  description:
    "Typical taxi journey times from Stopsley, Leagrave, Farley Hill, Wigmore and Challney to Luton Airport, plus tips for timing and booking an early or late transfer.",
  excerpt: "How long a taxi takes to Luton Airport from five popular Luton neighbourhoods, and when to book your pickup.",
  published: "2026-10-26",
  photo: images.localTrips,
  related: ["airport-transfers-from-luton-guide", "night-time-taxi-luton"],
  blocks: [
    {
      t: "p",
      x: "Planning a trip from Luton and wondering how long it takes to reach the airport? Whether you are flying for business or a holiday, a reliable taxi makes the start of the journey simple. Below are typical journey times from five popular Luton neighbourhoods, followed by advice on when to leave and how to book. Times are approximate and assume normal traffic outside the busiest periods.",
    },
    { t: "h2", x: "Stopsley to Luton Airport" },
    {
      t: "p",
      x: "Stopsley, on the eastern side of Luton, is a popular residential area for airport pickups. A taxi to the terminal normally takes about **10 to 15 minutes**, depending on traffic.",
    },
    { t: "h2", x: "Leagrave to Luton Airport" },
    {
      t: "p",
      x: "Leagrave, in the north-west of the town, is well connected and a common pickup point for early flights. Allow around **15 to 20 minutes** for the journey.",
    },
    { t: "h2", x: "Farley Hill to Luton Airport" },
    {
      t: "p",
      x: "From Farley Hill the airport is close, and the trip typically takes **10 to 15 minutes**, making it a convenient start to a holiday.",
    },
    { t: "h2", x: "Wigmore to Luton Airport" },
    {
      t: "p",
      x: "Wigmore is one of the closest neighbourhoods to the airport, with a typical journey of just **5 to 10 minutes**. It is ideal if you want to avoid a long commute before a flight but still want a door-to-door pickup.",
    },
    { t: "h2", x: "Challney to Luton Airport" },
    {
      t: "p",
      x: "For passengers in Challney, on the western side of Luton, a taxi to the airport normally takes about **15 to 20 minutes**.",
    },
    { t: "h2", x: "When should you leave?" },
    {
      t: "p",
      x: "The airport recommends arriving two to three hours before departure, so work back from your flight time and add a little extra for traffic. For a morning or evening journey in peak traffic, add a buffer. If your flight is very early or very late, remember that a higher night rate applies between 11pm and 6am, and your estimate shows this before you decide.",
    },
    {
      t: "ul",
      x: [
        "Book a day or more ahead for early-morning flights and busy holiday periods.",
        "Give your flight number so we can keep an eye on delays and adjust your pickup.",
        "Tell us how many people and how many bags are travelling so we can send the right vehicle: the LEVC TX e for up to six passengers, or the Mercedes Vito 114 for five or six with extra luggage.",
        "Remember that an airport fee is added when your journey starts or ends at the airport. It is shown as its own line in your estimate.",
      ],
    },
    { t: "h2", x: "Travelling from further afield?" },
    {
      t: "p",
      x: "We also cover journeys to Luton Airport from the towns around Luton, such as Dunstable, Harpenden and Hitchin. For anything further, see our [long-distance journeys](/services/long-distance-national-journeys). We also take passengers on the way back, from the airport to your door. Our [airport transfers](/services/airport-transfers) cover Luton, Heathrow, Gatwick, Stansted and London City.",
    },
    { t: "h2", x: "What can change your journey time" },
    {
      t: "ul",
      x: [
        "**Rush hour.** The school run and the morning and evening commute slow most routes across the town.",
        "**Peak flying periods.** Around school holidays and bank holidays the roads near the terminal are busier than usual.",
        "**Roadworks and incidents.** A closure on the main roads can add several minutes, so a driver who knows the local alternatives helps.",
        "**Weather.** Heavy rain, fog or ice slow everyone down, so leave a little longer in bad conditions.",
      ],
    },
    { t: "h2", x: "Coming home: from the airport to your door" },
    {
      t: "p",
      x: "The same neighbourhoods are just as easy to reach on the way back. Give us your flight number when you book and we will keep an eye on your arrival time, so your driver is waiting when you land, however late or early the flight is. After a long journey it is a relief to go straight from the terminal to your own front door with your luggage, instead of waiting for a bus or a connection.",
    },
    { t: "h2", x: "Quick questions" },
    { t: "h3", x: "How far ahead should I book?" },
    {
      t: "p",
      x: "As soon as you know your flight time. Booking a day or more ahead is sensible for early-morning flights and busy holiday periods, but you can also send a request for a shorter-notice journey and we will do our best to confirm it.",
    },
    { t: "h3", x: "Can you fit a family with suitcases?" },
    {
      t: "p",
      x: "Yes. Tell us how many passengers and bags there will be, and whether you need child seats, and we will send the right vehicle. You can compare both on our [fleet page](/fleet).",
    },
    { t: "h3", x: "What does the journey cost?" },
    {
      t: "p",
      x: "The price depends on the exact distance, the time of day and the airport fee, so we show it as an estimate rather than a flat figure. Enter your address on the [booking form](/#quote) and you will see a breakdown straight away. We confirm your quote with you before the journey.",
    },
    { t: "h2", x: "Why book Luton Connect Taxis for the airport?" },
    {
      t: "ul",
      x: [
        "Door-to-door pickups from any Luton neighbourhood, day or night.",
        "Flight monitoring and meet and greet on arrival.",
        "A clear estimate up front, with airport fees and extra charges shown separately.",
        "Wheelchair-accessible taxis with step-free ramp access, and space for your luggage.",
        "Pay your driver in the car, by card if you like.",
      ],
    },
    {
      t: "p",
      x: "Get your estimate on the [booking form](/#quote), call " +
        CALL +
        " or message us on " +
        WHATSAPP +
        ". Wherever you start in Luton, we will get you to the airport safely and on time.",
    },
  ],
};

const guide: BlogPost = {
  slug: "airport-transfers-from-luton-guide",
  title: "Airport Transfers From Luton: How to Book, What to Expect and What You Will Pay",
  description:
    "Your guide to airport transfers from Luton: how to book, our vehicles, how the price works, transfers to Heathrow, Gatwick and Stansted, and common questions.",
  excerpt: "How to book an airport transfer from Luton, how the estimate works and what to expect on the day.",
  published: "2026-10-26",
  photo: images.airportTransfers,
  related: ["luton-airport-taxi-guide-first-time-visitors", "flight-delayed-airport-taxi-rights", "taxi-to-luton-airport-from-luton-areas"],
  blocks: [
    {
      t: "p",
      x: "Travelling is exciting, but finding reliable transport to or from an airport can be a headache. A pre-booked airport transfer takes that stress away: a taxi is arranged for you, your driver knows your flight and you can relax from the moment you set off. This guide covers everything you need to know about booking an airport transfer from Luton, whether you are leaving from home, a hotel or the airport itself.",
    },
    { t: "h2", x: "Why choose Luton Connect Taxis for your airport transfer?" },
    {
      t: "ul",
      x: [
        "**Reliable, punctual drivers** who know the local roads and the airport.",
        "**Flight monitoring.** Give us your flight number and we adjust your pickup if you land early or late.",
        "**Meet and greet.** Your driver is waiting when you arrive, so there is no hunting for a taxi rank.",
        "**Comfortable vehicles.** Choose between the LEVC TX e and the Mercedes Vito 114.",
        "**A clear estimate** before you book, with airport fees and extra charges shown separately.",
        "**Pay in the car.** No online payment is needed, and card payments are accepted.",
      ],
    },
    { t: "h2", x: "Choosing the right vehicle" },
    {
      t: "p",
      x: "Our [fleet](/fleet) has two vehicles, each suited to a different kind of trip:",
    },
    {
      t: "ul",
      x: [
        "**LEVC TX e:** the purpose-built electric London taxi, with step-free ramp access, generous luggage space and a quiet, comfortable ride. A great choice for city trips, airport runs and wheelchair users.",
        "**Mercedes Vito 114:** extra room for larger groups and bigger luggage, ideal for families or parties of five or six.",
      ],
    },
    {
      t: "p",
      x: "Not sure which to pick? Tell us how many people and how much luggage you are bringing, and we will recommend the right vehicle.",
    },
    { t: "h2", x: "How to book your transfer" },
    {
      t: "ol",
      x: [
        "Go to the [booking form](/#quote) and enter your pickup and drop-off addresses. Address suggestions appear as you type.",
        "Choose your date and time, and the number of passengers.",
        "Look at your estimate, which shows the journey price plus any airport fee or other charge on separate lines.",
        "Add optional details: vehicle, luggage, child seats, flight number, a return journey or notes such as wheelchair access.",
        "Send your booking request. We confirm by WhatsApp, phone or email, and you pay your driver in the car.",
      ],
    },
    {
      t: "p",
      x: "You can also book by phone on " +
        CALL +
        ", through " +
        WHATSAPP +
        " or by email to " +
        EMAIL +
        ".",
    },
    { t: "h2", x: "How the price is worked out" },
    {
      t: "p",
      x: "Your estimate is based on the distance of the journey and the time of day. A higher night rate applies between 11pm and 6am. If your journey starts or ends at an airport, the airport fee is added, and if it enters the Congestion Charge zone in central London, that charge is added too.",
    },
    {
      t: "note",
      x: "Online estimates are not fixed prices. We confirm your quote with you by WhatsApp, phone or email before your journey.",
    },
    { t: "h2", x: "Transfers to other airports" },
    {
      t: "p",
      x: "Luton Airport is only the beginning. We run transfers between Luton or any UK address and Heathrow, Gatwick, Stansted and London City, as well as longer [national journeys](/services/long-distance-national-journeys). Each airport has its own drop-off or pick-up fee. It appears as a separate line in your estimate, or we confirm it when we send your quote, so you always know what you are paying for. For regular business trips, ask about our [corporate accounts](/services/corporate-accounts).",
    },
    { t: "h2", x: "Tips for a stress-free transfer" },
    {
      t: "ul",
      x: [
        "**Book early,** especially for school holidays, bank holidays and very early flights.",
        "**Check your flight details** when you book, so we can follow your flight.",
        "**Allow extra time** for traffic. The airport suggests arriving two to three hours before departure.",
        "**Be specific** about luggage, child seats and accessibility needs so we can send the right vehicle.",
        "**Keep your confirmation** handy on the day and check that the vehicle and driver match.",
      ],
    },
    { t: "h2", x: "Frequently asked questions" },
    { t: "h3", x: "Are airport transfers expensive?" },
    {
      t: "p",
      x: "The cost depends on the distance, the time of day, any airport fee and any extra charges on the route. Our online estimate shows how the total is made up, so you can decide before you commit. For short trips from Luton neighbourhoods, see our [guide to taxis to Luton Airport](/blog/taxi-to-luton-airport-from-luton-areas).",
    },
    { t: "h3", x: "Can I book a taxi when I arrive?" },
    {
      t: "p",
      x: "You can take a black cab from the airport rank, but pre-booking guarantees a vehicle and a driver who knows your flight. It is the better choice at busy times and late at night. Our [first-timer's guide](/blog/luton-airport-taxi-guide-first-time-visitors) explains both options.",
    },
    { t: "h3", x: "Can you meet special requests?" },
    {
      t: "p",
      x: "Yes. Tell us about wheelchair access, child seats, extra luggage or a second pickup when you book. The notes box on the booking form is there for exactly this.",
    },
    { t: "h3", x: "Do you take night and early-morning bookings?" },
    {
      t: "p",
      x: "Yes. A higher night rate applies between 11pm and 6am, and your estimate takes it into account. Read why a taxi suits [night-time travel](/blog/night-time-taxi-luton).",
    },
    { t: "h3", x: "What if my flight is delayed or cancelled?" },
    {
      t: "p",
      x: "Let us know as soon as you can. We monitor your flight, adjust your pickup if it lands early or late and talk you through your options if plans change. Our guide to [flight delays and your rights](/blog/flight-delayed-airport-taxi-rights) has more.",
    },
    { t: "h2", x: "Ready when you are" },
    {
      t: "p",
      x: "Booking an airport transfer should be the easy part of your trip. Get your estimate on the [booking form](/#quote) or contact us on " +
        CALL +
        " and we will take care of the rest.",
    },
  ],
};

/** Newest first; articles with the same date keep the order below. */
export const posts: readonly BlogPost[] = [guide, firstTimers, arriving, delays, areas, nightTravel].sort((a, b) =>
  b.published.localeCompare(a.published),
);

export const getPost = (slug: string): BlogPost | undefined => posts.find((p) => p.slug === slug);

/** Whole words in an article, links and bold markers removed. Used for the reading time. */
export function wordCount(post: BlogPost): number {
  const text = post.blocks
    .flatMap((b) => (typeof b.x === "string" ? [b.x] : b.x))
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "");
  return text.split(/\s+/).filter(Boolean).length;
}

export const readingMinutes = (post: BlogPost): number => Math.max(1, Math.round(wordCount(post) / 200));
