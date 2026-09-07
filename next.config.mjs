/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // firebase-admin pulls in jwks-rsa, which pulls in jose (ESM-only) —
  // this breaks Vercel's serverless require() bundling. The "jose"
  // override in package.json is the real fix; this is a harmless second
  // layer of defense.
  //
  // NOTE: on Next.js 14.x this option lives under `experimental`, not as
  // a top-level key. `serverExternalPackages` (top-level) is a Next 15
  // option — using it here on 14.2.35 gets silently ignored by Next
  // ("Unrecognized key(s) in object") and does nothing.
  experimental: {
    serverComponentsExternalPackages: ["jwks-rsa", "jose"],
  },
};

export default nextConfig;