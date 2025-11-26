import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@libsql/client'],
  webpack: (config) => {
    config.externals = [...(config.externals || []), '@libsql/client']
    return config
  },
  transpilePackages: ['@alb-analyzer/db'],
  // Skip static generation during build for dynamic pages
  output: 'standalone',
}

export default nextConfig
