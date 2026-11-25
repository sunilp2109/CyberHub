import { NextResponse, type NextRequest } from "next/server";

const api = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const staffPortal = process.env.NEXT_PUBLIC_AUTH_PORTAL_URL ?? "http://localhost:3001";

export async function proxy(request: NextRequest) {
  const login = new URL("/login", staffPortal);
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
    if (role === "STUDENT") return NextResponse.next();
    if (role === "DEPARTMENT_ADMIN") return NextResponse.redirect(new URL("/department-admin", staffPortal));
    if (role === "FACULTY" || role === "HOD" || role === "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", staffPortal));
    }
  } catch {
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/dashboard/:path*", "/profile/:path*", "/:module(projects|internships|certificates|competitions|publications|patents|research|workshops|conferences|hackathons|leadership|volunteering|awards)/:path*"] };
