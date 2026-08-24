import type { NextConfig } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const nextConfig: NextConfig = {
    /**
     * Proxy all /api/* requests to the Express backend.
     *
     * Why: the frontend runs on localhost:3000 and the backend on
     * localhost:5000.  Browsers treat these as different origins for
     * cross-site cookie purposes, so auth cookies set by the backend are
     * silently dropped by Chrome on subsequent fetch() calls from the
     * frontend.
     *
     * By routing /api/* through Next.js's built-in reverse-proxy the
     * browser always sees requests on the same origin (localhost:3000),
     * so the session cookie is included on every request automatically —
     * no CORS or SameSite configuration required.
     */
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${BACKEND_URL}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
