/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src']
  },
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  // Disable image optimization warnings for build
  experimental: {
    esmExternals: false
  }
}

module.exports = nextConfig