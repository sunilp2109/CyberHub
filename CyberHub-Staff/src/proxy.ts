import { NextResponse, type NextRequest } from "next/server";

const api = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const studentPortal = process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL ?? "http://localhost:3000";

export async function proxy(request: NextRequest) {
  const login = new URL("/login", request.url);
  const cookie = request.headers.get("cookie");
  if (!cookie) return NextResponse.redirect(login);

  try {
    const response = await fetch(`${api}/api/v1/auth/me`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return NextResponse.redirect(login);
    const { data: { role } } = await response.json();
    if (role === "STUDENT") return NextResponse.redirect(new URL("/dashboard", studentPortal));
    if (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) {
      if (role === "ADMIN") return NextResponse.next();
      return NextResponse.redirect(new URL(role === "FACULTY" || role === "HOD" ? "/dashboard" : "/login", request.url));
    }
    if (role === "FACULTY" || role === "HOD" || role === "ADMIN") return NextResponse.next();
  } catch {
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/dashboard/:path*", "/events/:path*", "/add-event/:path*", "/approvals/:path*", "/student-records/:path*", "/profile/:path*", "/admin/:path*"] };
