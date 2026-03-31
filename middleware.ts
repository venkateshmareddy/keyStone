import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  let token: Awaited<ReturnType<typeof getToken>> = null;
  if (secret) {
    try {
      token = await getToken({
        req,
        secret,
        secureCookie: process.env.NODE_ENV === "production",
      });
    } catch {
      token = null;
    }
  }

  const path = req.nextUrl.pathname;

  if (path.startsWith("/dashboard") && !token) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  if ((path === "/login" || path === "/signup") && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
