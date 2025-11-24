import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Super admin routes
    if (path.startsWith("/admin") && token?.role !== "super_admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Customer admin routes
    if (path.startsWith("/customer-admin") && token?.role !== "customer_admin" && token?.role !== "super_admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Data management routes (lookup data) - only for super admins and customer admins
    if (path.startsWith("/data") && token?.role === "operator") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Regular user routes - all authenticated users can access, but specific roles are handled above
    if (path.startsWith("/voyages") || path.startsWith("/claims")) {
      if (!token) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without token
        if (req.nextUrl.pathname.startsWith("/auth")) {
          return true;
        }
        // Require token for all other pages
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

