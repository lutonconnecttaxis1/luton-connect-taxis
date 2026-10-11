import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateJourney } from "./journey";

// "Now" for every test: Monday 5 Oct 2026, 10:00 London (09:00 UTC, BST)
const NOW = new Date("2026-10-05T09:00:00Z");

const place = (id: string, text: string) => ({ placeId: id, text });
const valid = () => ({
  pickup: place("ChIJluton_example_1", "Luton Airport"),
  dropoff: place("ChIJheathrow_example_2", "Heathrow Airport"),
  date: "2026-10-12",
  time: "09:30",
  passengers: 2,
  returnTrip: null,
});

function errorsFor(raw: unknown) {
  const r = validateJourney(raw, NOW);
  assert.equal(r.ok, false);
  return r.ok ? {} : r.errors;
}

describe("validateJourney", () => {
  it("accepts a good journey", () => {
    const r = validateJourney(valid(), NOW);
    assert.ok(r.ok);
    assert.equal(r.data.passengers, 2);
    assert.equal(r.data.returnTrip, null);
  });

  it("accepts passengers sent as a string (from a form field)", () => {
    const r = validateJourney({ ...valid(), passengers: "4" }, NOW);
    assert.ok(r.ok);
    assert.equal(r.data.passengers, 4);
  });

  it("needs two real, different places", () => {
    assert.ok(errorsFor({ ...valid(), pickup: { placeId: "", text: "x" } }).pickup);
    assert.ok(errorsFor({ ...valid(), dropoff: { placeId: "bad id with spaces!", text: "x" } }).dropoff);
    assert.ok(errorsFor({ ...valid(), pickup: null }).pickup);
    assert.ok(errorsFor({ ...valid(), dropoff: valid().pickup }).dropoff);
  });

  it("rejects past times and pickups within the hour, accepts one hour ahead", () => {
    assert.match(errorsFor({ ...valid(), date: "2026-10-05", time: "09:00" }).time ?? "", /already passed/);
    assert.match(errorsFor({ ...valid(), date: "2026-10-05", time: "10:30" }).time ?? "", /call us/);
    assert.ok(validateJourney({ ...valid(), date: "2026-10-05", time: "11:00" }, NOW).ok);
    assert.ok(errorsFor({ ...valid(), date: "2026-10-04" }).time);
  });

  it("rejects dates more than a year ahead", () => {
    assert.ok(errorsFor({ ...valid(), date: "2027-12-01" }).date);
  });

  it("rejects bad dates and times", () => {
    assert.ok(errorsFor({ ...valid(), date: "12/10/2026" }).date);
    assert.ok(errorsFor({ ...valid(), time: "9:30pm" }).time);
  });

  it("limits passengers to 6 and says to call for more", () => {
    assert.match(errorsFor({ ...valid(), passengers: 7 }).passengers ?? "", /call us/);
    assert.ok(errorsFor({ ...valid(), passengers: 0 }).passengers);
    assert.ok(errorsFor({ ...valid(), passengers: "abc" }).passengers);
  });

  it("checks the return journey comes after the outbound one", () => {
    const ok = validateJourney({ ...valid(), returnTrip: { date: "2026-10-14", time: "18:00" } }, NOW);
    assert.ok(ok.ok);
    assert.deepEqual(ok.data.returnTrip, { date: "2026-10-14", time: "18:00" });
    assert.ok(errorsFor({ ...valid(), returnTrip: { date: "2026-10-12", time: "09:30" } }).returnTime);
    assert.ok(errorsFor({ ...valid(), returnTrip: { date: "2026-10-11", time: "09:30" } }).returnTime);
    assert.ok(errorsFor({ ...valid(), returnTrip: { date: "", time: "" } }).returnDate);
  });

  it("copes with junk input", () => {
    assert.equal(validateJourney(null, NOW).ok, false);
    assert.equal(validateJourney("hello", NOW).ok, false);
    assert.equal(validateJourney({}, NOW).ok, false);
  });
});
