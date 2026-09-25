import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  console.log("Token present:", !!token, "Length:", token.length);

  const address = "Victoria Island, Lagos";
  const encoded = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1`;

  const res = await fetch(url);
  console.log("Status:", res.status, res.statusText);
  const body = await res.text();
  console.log("Body:", body);
}

main();