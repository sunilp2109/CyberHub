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
    const { data: { role, department } } = await response.json();
    if (role === "STUDENT") return NextResponse.redirect(new URL("/dashboard", studentPortal));
    const departmentPortal = request.nextUrl.pathname === "/department-admin" || request.nextUrl.pathname.startsWith("/department-admin/");
    if (role === "DEPARTMENT_ADMIN" && department?.id && department.active !== false) {
      return departmentPortal ? NextResponse.next() : NextResponse.redirect(new URL("/department-admin", request.url));
    }
    if (departmentPortal && (role === "FACULTY" || role === "HOD" || role === "ADMIN")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (role === "FACULTY" || role === "HOD" || role === "ADMIN") return NextResponse.next();
  } catch {
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/department-admin/:path*", "/dashboard/:path*", "/events/:path*", "/add-event/:path*", "/approvals/:path*", "/student-records/:path*", "/profile/:path*"] };
