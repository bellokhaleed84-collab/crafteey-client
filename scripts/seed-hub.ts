/**
 * Seeds sample vendors + products so the Hub has real data to test with.
 *
 *   npx tsx --env-file=.env.local scripts/seed-hub.ts          # add sample data
 *   npx tsx --env-file=.env.local scripts/seed-hub.ts --reset  # remove sample data only
 *
 * Only documents flagged isSeed:true are ever touched, so real vendor data is safe.
 * Prices are in KOBO (₦2,500 = 250000).
 */
import mongoose from "mongoose";
import HubVendor from "../src/models/HubVendor";
import HubProduct from "../src/models/HubProduct";
import type { HubCategory } from "../src/lib/hub/config";

type SeedProduct = { name: string; priceKobo: number; unit?: string; description?: string };
type SeedVendor = { name: string; category: HubCategory; description: string; products: SeedProduct[] };

const naira = (n: number) => n * 100;

const DATA: SeedVendor[] = [
  {
    name: "Mama Put Kitchen",
    category: "food",
    description: "Home-style Nigerian meals",
    products: [
      { name: "Jollof Rice & Chicken", priceKobo: naira(3500), unit: "1 plate" },
      { name: "Fried Rice & Turkey", priceKobo: naira(4000), unit: "1 plate" },
      { name: "Pounded Yam & Egusi", priceKobo: naira(4500), unit: "1 plate" },
      { name: "Pepper Soup (Goat)", priceKobo: naira(3000), unit: "1 bowl" },
    ],
  },
  {
    name: "Lagos Grill House",
    category: "food",
    description: "Suya, grilled fish and more",
    products: [
      { name: "Beef Suya", priceKobo: naira(2500), unit: "1 stick pack" },
      { name: "Grilled Catfish", priceKobo: naira(6500), unit: "1 fish" },
      { name: "Peppered Gizzard", priceKobo: naira(2000), unit: "1 portion" },
    ],
  },
  {
    name: "Fresh Basket Groceries",
    category: "groceries",
    description: "Fresh produce and pantry staples",
    products: [
      { name: "Rice (Long Grain)", priceKobo: naira(72000), unit: "50kg bag" },
      { name: "Tomatoes", priceKobo: naira(3500), unit: "1 basket" },
      { name: "Eggs", priceKobo: naira(4200), unit: "1 crate (30)" },
      { name: "Vegetable Oil", priceKobo: naira(6800), unit: "3 litres" },
      { name: "Bread (Sliced)", priceKobo: naira(1800), unit: "1 loaf" },
    ],
  },
  {
    name: "Chill Spot Drinks",
    category: "drinks",
    description: "Cold drinks, delivered",
    products: [
      { name: "Bottled Water", priceKobo: naira(3000), unit: "pack of 12" },
      { name: "Soft Drink (Cola)", priceKobo: naira(4500), unit: "pack of 12" },
      { name: "Zobo", priceKobo: naira(1500), unit: "1 bottle" },
      { name: "Fresh Orange Juice", priceKobo: naira(2500), unit: "1 litre" },
    ],
  },
  {
    name: "Naija Market Hub",
    category: "marketplace",
    description: "Everyday items and gadgets",
    products: [
      { name: "Phone Charger (Fast)", priceKobo: naira(6500) },
      { name: "Rechargeable Lamp", priceKobo: naira(9500) },
      { name: "Kitchen Knife Set", priceKobo: naira(12000) },
      { name: "Bluetooth Earbuds", priceKobo: naira(15000) },
    ],
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (run with --env-file=.env.local)");
  await mongoose.connect(uri);

  const seedVendors = await HubVendor.find({ isSeed: true }).select("_id");
  const ids = seedVendors.map((v) => v._id);
  await HubProduct.deleteMany({ $or: [{ isSeed: true }, { vendorId: { $in: ids } }] });
  await HubVendor.deleteMany({ isSeed: true });

  if (process.argv.includes("--reset")) {
    console.log("Sample data removed.");
  } else {
    for (const v of DATA) {
      const vendor = await HubVendor.create({
        name: v.name,
        categories: [v.category],
        description: v.description,
        isOpen: true,
        isActive: true,
        isSeed: true,
      });
      await HubProduct.insertMany(
        v.products.map((p) => ({ ...p, vendorId: vendor._id, category: v.category, isSeed: true }))
      );
    }
    console.log(`Seeded ${DATA.length} vendors and ${DATA.reduce((s, v) => s + v.products.length, 0)} products.`);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
