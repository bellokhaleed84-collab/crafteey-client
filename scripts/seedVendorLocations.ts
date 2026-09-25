/**
 * One-off: assigns real Lagos addresses to the existing seed vendors (who
 * currently have no address at all) and geocodes them via Mapbox, so
 * checkout has real coordinates to calculate delivery fees against.
 *
 * Run once with: npx tsx scripts/seedVendorLocations.ts
 * Safe to re-run — it just overwrites address/lat/lng each time.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import HubVendor from "../src/models/HubVendor";
import { geocodeAddress } from "../src/lib/geocode";

// Real, spread-out Lagos landmarks — picked so distance-based pricing
// actually varies between vendors instead of clustering in one spot.
const VENDOR_ADDRESSES: Record<string, string> = {
  "Mama Put Kitchen": "Ikeja, Lagos",
  "Lagos Grill House": "Victoria Island, Lagos",
  "Fresh Basket Groceries": "Surulere, Lagos",
  "Chill Spot Drinks": "Lekki Phase 1, Lagos",
  "Naija Market Hub": "Yaba, Lagos",
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");
  await mongoose.connect(uri);

  const vendors = await HubVendor.find({ name: { $in: Object.keys(VENDOR_ADDRESSES) } });
  console.log(`Found ${vendors.length} matching vendor(s).`);

  let success = 0;
  let failed = 0;

  for (const vendor of vendors) {
    const address = VENDOR_ADDRESSES[vendor.name];
    if (!address) continue;

    const result = await geocodeAddress(address);
    if (result) {
      vendor.address = address;
      vendor.lat = result.lat;
      vendor.lng = result.lng;
      await vendor.save();
      console.log(`✅ ${vendor.name} — ${address} → (${result.lat}, ${result.lng})`);
      success++;
    } else {
      console.warn(`⚠️  ${vendor.name} — could not geocode "${address}"`);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone. ${success} set, ${failed} failed.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});