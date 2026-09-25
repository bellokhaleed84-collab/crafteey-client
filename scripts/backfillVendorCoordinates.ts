/**
 * One-time backfill: geocodes every HubVendor that has an address but no
 * lat/lng yet, using the same Mapbox geocoding wrapper crafteey-rider
 * already uses. Run once with: npx tsx scripts/backfillVendorCoordinates.ts
 *
 * Safe to re-run — it only touches vendors where lat or lng is missing.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import HubVendor from "../src/models/HubVendor";
import { geocodeAddress } from "../src/lib/geocode";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");
  await mongoose.connect(uri);

  const total = await HubVendor.countDocuments();
  console.log(`Total vendors in DB: ${total}`);

  // DIAGNOSTIC: dump every vendor's name/address/lat/lng so we can see
  // exactly what's stored before deciding what the backfill filter should be.
  const all = await HubVendor.find().select("name address lat lng").lean();
  console.log("All vendors:", JSON.stringify(all, null, 2));

  const vendors = await HubVendor.find({
    address: { $exists: true, $ne: "" },
    $or: [{ lat: { $exists: false } }, { lng: { $exists: false } }],
  });

  console.log(`Found ${vendors.length} vendor(s) missing coordinates.`);

  let success = 0;
  let failed = 0;

  for (const vendor of vendors) {
    const result = await geocodeAddress(vendor.address!);
    if (result) {
      vendor.lat = result.lat;
      vendor.lng = result.lng;
      await vendor.save();
      console.log(`✅ ${vendor.name} — ${vendor.address} → (${result.lat}, ${result.lng})`);
      success++;
    } else {
      console.warn(`⚠️  ${vendor.name} — could not geocode "${vendor.address}"`);
      failed++;
    }
    // Be gentle with Mapbox's rate limit
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone. ${success} geocoded, ${failed} failed.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});