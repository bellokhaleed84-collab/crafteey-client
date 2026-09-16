import { latLngToCell, gridDisk } from "h3-js";

// H3 resolution: how fine-grained the hexagonal grid is. Configurable via
// env var rather than hardcoded, per the requirement that this not be a
// silent hardcoded choice.
//
// WHY RESOLUTION 8 AS THE DEFAULT:
// H3 resolution 8 cells have an average edge length of ~0.46 km and an
// average area of ~0.74 km². For a dense urban environment like Lagos,
// that's fine-grained enough to produce a meaningfully "nearby" shortlist
// of couriers (a resolution-6 cell, by contrast, averages ~36 km² — far
// too coarse, you'd pull in couriers from the other side of the city as
// "neighbors"). Resolution 9 or 10 would be more precise still, but at
// the cost of needing to search a wider ring of cells to cover the same
// real-world radius, and more storage/index churn as couriers move
// between cells more frequently. Resolution 8 is the standard starting
// point recommended for city-scale ride/delivery matching — precise
// enough to be useful, coarse enough that a courier's cell doesn't
// change on every few meters of movement.
export const H3_RESOLUTION = Number(process.env.H3_RESOLUTION ?? 8);

/**
 * Converts a lat/lng pair into its H3 cell index string at the
 * configured resolution. This is what gets stored in currentH3Cell /
 * pickupH3Cell etc.
 */
export function locationToH3Cell(lat: number, lng: number): string {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

/**
 * Returns the given cell plus its surrounding ring(s) of neighboring
 * cells — the "candidate discovery" step in the matching pipeline
 * (search the customer's cell, then widen outward if too few candidates
 * are found). k=1 returns the cell itself plus its 6 immediate
 * neighbors; increase k to widen the search radius.
 *
 * IMPORTANT: this only narrows the candidate pool cheaply via an
 * indexed string match. It does NOT mean the closest cell contains the
 * closest courier — always follow this with a PostGIS ST_Distance /
 * ST_DWithin query on the shortlist for the actual ranking.
 */
export function nearbyH3Cells(cell: string, k: number = 1): string[] {
  return gridDisk(cell, k);
}
