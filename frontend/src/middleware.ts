import { NextRequest, NextResponse } from "next/server";

/**
 * Edge Middleware — runs before any page render.
 *
 * Reads the JWT cookie and:
 *   • Root "/" → redirect to the correct role dashboard instantly
 *   • No token on any protected path → redirect to /login
 *
 * This eliminates the full-screen spinner on root and prevents
 * the double-render waterfall on every cold load.
 */

const ROLE_REDIRECTS: Record<string, string> = {
    ADMIN: "/admin/staff",
    RECEPTIONIST: "/reception/dashboard",
    DOCTOR: "/doctor/dashboard",
    NURSE: "/nurse",
    LAB_TECHNICIAN: "/lab/queue",
    RADIOLOGIST: "/radiology/queue",
    PHARMACIST: "/pharmacy",
    CASHIER: "/cashier",
};

// Paths that DON'T require authentication
const PUBLIC_PATHS = ["/login", "/unauthorized"];

// Decode a JWT payload without a crypto library (edge runtime compatible).
// We only need the payload claims — signature verification happens on the backend.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        // Base64url → Base64 → JSON
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(
            base64.length + ((4 - (base64.length % 4)) % 4),
            "="
        );
        const json = atob(padded);
        return JSON.parse(json) as Record<string, unknown>;
    } catch {
        return null;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip Next.js internals and static assets
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // Allow public paths through
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return NextResponse.next();
    }

    const token = request.cookies.get("token")?.value;

    // No token → send to login
    if (!token) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        return NextResponse.redirect(loginUrl);
    }

    const payload = decodeJwtPayload(token);

    // Malformed token → send to login
    if (!payload) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        return NextResponse.redirect(loginUrl);
    }

    // Check expiry (JWT exp is in seconds)
    const exp = payload.exp as number | undefined;
    if (exp && Date.now() / 1000 > exp) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        return NextResponse.redirect(loginUrl);
    }

    // Root "/" → redirect to role-specific dashboard (no spinner page needed)
    if (pathname === "/") {
        const role = payload.role as string | undefined;
        const destination = (role && ROLE_REDIRECTS[role]) || "/login";
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = destination;
        return NextResponse.redirect(dashboardUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
