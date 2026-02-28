/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['api.mapbox.com', 'tile.openstreetmap.org'],
    formats: ['image/webp', 'image/avif'],
  },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    return config;
  },
};

export default nextConfig;
