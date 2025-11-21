/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Default to localhost for local development, but allow override via environment variable
    // This ensures localhost works even when production URL is set
    NEXT_PUBLIC_API_URL: 'https://apiservices-backend.onrender.com',
  },
}

module.exports = nextConfig

