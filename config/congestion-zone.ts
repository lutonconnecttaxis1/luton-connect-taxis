/**
 * Central London Congestion Charge zone – APPROXIMATE outline.
 *
 * Traced from the client's map (reference/congestion-charge-zone-map.png) and
 * calibrated against known landmarks, so edges can be off by roughly 100–200 m.
 * Good enough for an estimate that is already "not a fixed price"; the real
 * charge is confirmed by the office.
 *
 * TODO (milestone 7): replace with TfL's official boundary file. The code only
 * needs a closed ring of [longitude, latitude] pairs, so swapping is a data change.
 */
export const congestionZoneApproximate = true;

/** Ring of [longitude, latitude] points, clockwise from the western tip (Edgware Road). */
export const congestionZone: ReadonlyArray<readonly [number, number]> = [
  [-0.1672, 51.5169],
  [-0.1629, 51.5191],
  [-0.1581, 51.5202],
  [-0.1539, 51.5209],
  [-0.1467, 51.5218],
  [-0.1383, 51.5228],
  [-0.1347, 51.5235],
  [-0.1299, 51.5263],
  [-0.1233, 51.5289],
  [-0.116, 51.529],
  [-0.1094, 51.5301],
  [-0.1058, 51.5302],
  [-0.1016, 51.5295],
  [-0.0986, 51.5275],
  [-0.0902, 51.5249],
  [-0.086, 51.5239],
  [-0.0806, 51.5227],
  [-0.0773, 51.5201],
  [-0.074, 51.5163],
  [-0.0716, 51.5131],
  [-0.073, 51.5112],
  [-0.074, 51.5081],
  [-0.0752, 51.5053],
  [-0.0773, 51.5018],
  [-0.0785, 51.4984],
  [-0.0809, 51.4956],
  [-0.0848, 51.4934],
  [-0.0908, 51.4925],
  [-0.0956, 51.4931],
  [-0.0992, 51.4938],
  [-0.1002, 51.4917],
  [-0.104, 51.4899],
  [-0.1076, 51.4873],
  [-0.1124, 51.4854],
  [-0.1191, 51.4848],
  [-0.1239, 51.4849],
  [-0.1271, 51.4862],
  [-0.1341, 51.4888],
  [-0.1401, 51.4921],
  [-0.1425, 51.4947],
  [-0.1461, 51.4966],
  [-0.1495, 51.4998],
  [-0.1513, 51.5009],
  [-0.1521, 51.5029],
  [-0.1527, 51.5059],
  [-0.1569, 51.5103],
  [-0.1603, 51.5129],
  [-0.1629, 51.5144],
  [-0.1656, 51.5157],
];
