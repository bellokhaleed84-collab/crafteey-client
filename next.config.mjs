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
  serverExternalPackages: ["jwks-rsa", "jose"],
};

export default nextConfig;
