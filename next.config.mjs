/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'react-native-sqlite-storage': false,
      '@sap/hana-client': false,
      'mongodb-client-encryption': false, // This whole code is avoiding these unnecessary packages to show error logs
    };

    return config;
  },
};

export default nextConfig;
