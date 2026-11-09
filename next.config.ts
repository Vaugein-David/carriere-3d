import type { NextConfig } from 'next';

// Export statique pour GitHub Pages (npm run build:pages) : site servi sous NEXT_PUBLIC_BASE_PATH
const staticExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Les rendus Blender sont déjà en WebP, pas d'optimisation d'image
  images: { unoptimized: true },
  ...(staticExport && {
    output: 'export',
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
    trailingSlash: true,
  }),
};

export default nextConfig;
