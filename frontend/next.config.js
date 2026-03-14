/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },

    // Backend API URL for server-side requests
    env: {
        NEXT_PUBLIC_API_URL:
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    },

    // Transpile three.js for Next.js compatibility
    transpilePackages: ["three"],

    // React strict mode
    reactStrictMode: true,
};

module.exports = nextConfig;