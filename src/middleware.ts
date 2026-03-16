import { withAuth } from "next-auth/middleware";

export default withAuth({
    pages: {
        signIn: "/login",
    },
});

export const config = {
    matcher: [
        "/",
        "/dashboard",
        "/dashboard/:path*",
        "/library/:path*",
        "/ai/:path*",
        "/tasks/:path*",
        "/settings/:path*",
        "/onboarding/:path*"
    ],
};
