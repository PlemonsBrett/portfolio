/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['res.cloudinary.com'], // Allow external images if necessary
    },
    // Suppress the punycode deprecation warning
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                punycode: false
            };
        }
        return config;
    }
};

export default nextConfig;
