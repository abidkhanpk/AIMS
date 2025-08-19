/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src']
  },
  images: {
    domains: ['localhost'],
    unoptimized: true
  }
}

module.exports = nextConfig