import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

export async function middleware(req: NextRequest) {
  const signedIn = DEMO
    ? req.cookies.get("pl_demo")?.value === "1"
    : !!(await verifySession(req.cookies.get(SESSION_COOKIE)?.value));
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/app") && !signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/" || pathname === "/login" || pathname === "/signup") && signedIn) {
    return NextResponse.redirect(new URL("/app", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/app/:path*", "/login", "/signup"] };
