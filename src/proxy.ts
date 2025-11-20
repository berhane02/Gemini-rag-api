import { type NextRequest, NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

export default async function proxy(request: NextRequest) {
    return NextResponse.next();
    // return await auth0.middleware(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
