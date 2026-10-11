import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { generateKeyPairSync } from "node:crypto";
import { clearTokenCache } from "./firestore";
import { eraseAccountData, listMyBookings, readProfile, saveProfile, toMyBooking } from "./customers";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const realFetch = globalThis.fetch;
type Call = { url: string; method: string; body: unknown };
let calls: Call[] = [];
let respond: (call: Call) => { status: number; body: unknown } = () => ({ status: 200, body: {} });

beforeEach(() => {
  clearTokenCache();
  calls = [];
  respond = () => ({ status: 200, body: {} });
  process.env.FIREBASE_ADMIN_PROJECT_ID = "demo";
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "svc@demo.iam.gserviceaccount.com";
  process.env.FIREBASE_ADMIN_PRIVATE_KEY = privateKey;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    if (url === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
    }
    const call: Call = { url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    const r = respond(call);
    return new Response(JSON.stringify(r.body), { status: r.status });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const S = (stringValue: string) => ({ stringValue });
const stored = (over: Record<string, unknown> = {}) => ({
  reference: S("LCT-ABC234"),
  status: S("requested"),
  createdAt: { timestampValue: "2026-10-05T10:00:00Z" },
  userId: S("u1"),
  customer: { mapValue: { fields: { email: S("secret@x.co") } } },
  notifications: { mapValue: { fields: { business: S("sent") } } },
  journey: {
    mapValue: {
      fields: {
        // the real shape: a place is { placeId, text }
        pickup: { mapValue: { fields: { placeId: S("ChIJ1"), text: S("Luton Airport") } } },
        dropoff: { mapValue: { fields: { placeId: S("ChIJ2"), text: S("Heathrow") } } },
        date: S("2026-10-20"),
        time: S("10:30"),
        passengers: { integerValue: "2" },
        returnTrip: { nullValue: null },
      },
    },
  },
  options: { mapValue: { fields: { luggage: S("1–2 bags"), vehicle: S("No preference"), childSeats: { integerValue: "0" }, flightNumber: { nullValue: null }, notes: { nullValue: null } } } },
  estimate: {
    mapValue: {
      fields: {
        total: { doubleValue: 75 },
        hasPendingFees: { booleanValue: false },
        miles: { doubleValue: 25 },
        outbound: {
          mapValue: {
            fields: {
              bandReason: S("Day rate"),
              lines: { arrayValue: { values: [{ mapValue: { fields: { label: S("Base fare"), amount: { integerValue: "8" } } } }, { mapValue: { fields: { label: S("Airport fee"), amount: { nullValue: null } } } }] } },
            },
          },
        },
        returnLeg: { nullValue: null },
      },
    },
  },
  ...over,
});

describe("profiles", () => {
  it("reads name and phone, and copes with a missing profile", async () => {
    respond = () => ({ status: 200, body: { fields: { name: S("Sam"), phone: S("07700 900123") } } });
    assert.deepEqual(await readProfile("u1", "a@b.co"), { uid: "u1", email: "a@b.co", name: "Sam", phone: "07700 900123" });
    respond = () => ({ status: 404, body: {} });
    assert.deepEqual(await readProfile("u1", "a@b.co"), { uid: "u1", email: "a@b.co", name: "", phone: "" });
  });

  it("does not lock anyone out when Firestore errors", async () => {
    respond = () => ({ status: 500, body: {} });
    assert.equal((await readProfile("u1", "a@b.co")).name, "");
  });

  it("saves with a field mask so only those fields change", async () => {
    await saveProfile("u1", { name: "Sam", phone: "", email: "a@b.co" }, new Date("2026-10-05T10:00:00Z"));
    assert.equal(calls[0].method, "PATCH");
    assert.match(calls[0].url, /customers\/u1\?/);
    assert.match(calls[0].url, /updateMask\.fieldPaths=name/);
    assert.match(calls[0].url, /updateMask\.fieldPaths=updatedAt/);
  });
});

describe("my bookings", () => {
  it("queries by userId and returns newest first, without internal fields", async () => {
    respond = (call) => {
      assert.match(call.url, /:runQuery$/);
      const q = (call.body as { structuredQuery: { where: { fieldFilter: { field: { fieldPath: string }; value: { stringValue: string } } } } }).structuredQuery;
      assert.equal(q.where.fieldFilter.field.fieldPath, "userId");
      assert.equal(q.where.fieldFilter.value.stringValue, "u1");
      return {
        status: 200,
        body: [
          { document: { fields: stored({ reference: S("LCT-OLD222"), createdAt: { timestampValue: "2026-10-01T10:00:00Z" } }) } },
          { readTime: "x" },
          { document: { fields: stored() } },
        ],
      };
    };
    const list = await listMyBookings("u1");
    assert.deepEqual(list.map((b) => b.reference), ["LCT-ABC234", "LCT-OLD222"]);
    const first = list[0];
    assert.equal(first.journey.pickup, "Luton Airport");
    assert.equal(first.journey.dropoff, "Heathrow");
    assert.equal(first.journey.passengers, 2);
    assert.equal(first.estimate?.total, 75);
    assert.deepEqual(first.estimate?.legs[0].lines, [
      { label: "Base fare", amount: 8 },
      { label: "Airport fee", amount: null },
    ]);
    const text = JSON.stringify(list);
    assert.ok(!text.includes("secret@x.co"));
    assert.ok(!text.includes("notifications"));
    assert.ok(!text.includes("userId"));
  });

  it("also copes with a place stored as plain text", () => {
    const b = toMyBooking({ reference: "LCT-TXT222", journey: { pickup: "A street", dropoff: { text: "B road", placeId: "x" }, date: "2026-10-20", time: "10:00" } });
    assert.equal(b?.journey.pickup, "A street");
    assert.equal(b?.journey.dropoff, "B road");
    assert.ok(!JSON.stringify(b).includes("placeId"));
  });

  it("skips records that are not usable bookings", () => {
    assert.equal(toMyBooking({}), null);
    assert.equal(toMyBooking({ reference: "LCT-X" }), null);
  });

  it("labels a two-leg booking Outbound / Return", () => {
    const b = toMyBooking({
      reference: "LCT-RET222",
      journey: { pickup: "A", dropoff: "B", date: "2026-10-20", time: "10:00", passengers: 1, returnTrip: { date: "2026-10-21", time: "12:00" } },
      estimate: { total: 100, miles: 10, outbound: { lines: [] }, returnLeg: { lines: [] } },
    });
    assert.deepEqual(b?.estimate?.legs.map((l) => l.title), ["Outbound", "Return"]);
    assert.deepEqual(b?.journey.returnTrip, { date: "2026-10-21", time: "12:00" });
  });
});

describe("deleting an account's data", () => {
  it("detaches every booking, then removes the profile", async () => {
    respond = (call) => {
      if (call.url.endsWith(":runQuery")) {
        return { status: 200, body: [{ document: { fields: stored() } }, { document: { fields: stored({ reference: S("LCT-TWO222") }) } }] };
      }
      return { status: 200, body: {} };
    };
    const result = await eraseAccountData("u1");
    assert.equal(result.detached, 2);
    const patches = calls.filter((c) => c.method === "PATCH");
    assert.equal(patches.length, 2);
    assert.match(patches[0].url, /bookings\/LCT-ABC234\?updateMask\.fieldPaths=userId/);
    assert.deepEqual((patches[0].body as { fields: unknown }).fields, { userId: { nullValue: null } });
    const del = calls.find((c) => c.method === "DELETE");
    assert.match(del?.url ?? "", /customers\/u1$/);
  });
});
