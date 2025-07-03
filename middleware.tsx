import { NextResponse } from "next/server";

export function middleware(req: any) {
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "*",
    "http://10.1.10.231:3000",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://alien-cafe-server.vercel.app",
    "https://aliencafe.vercel.app",
    "https://alien-cafe.vercel.app",
    "https://alien-cafe-server.onrender.com",
    "https://aliencafe.onrender.com",
    "https://alien-cafe-frontend.onrender.com",
    "https://aliencafe-backend.onrender.com"
  ];

  const response = NextResponse.next();

  if (allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  );

  // Allow iframe embedding for video content
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  
  // Content Security Policy to allow video embeds
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://platform.twitter.com https://www.youtube.com https://player.vimeo.com https://www.dailymotion.com https://player.twitch.tv https://www.googletagmanager.com https://www.google-analytics.com",
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.dailymotion.com https://player.twitch.tv https://platform.twitter.com https://www.facebook.com https://www.instagram.com https://www.tiktok.com https://www.youtube-nocookie.com",
    "img-src 'self' data: https: http: blob:",
    "media-src 'self' https: http: blob:",
    "connect-src 'self' https: http: wss: ws:",
    "style-src 'self' 'unsafe-inline' https:",
    "font-src 'self' https: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests"
  ].join("; ");
  
  response.headers.set("Content-Security-Policy", csp);

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: "/api/:path*", // Apply middleware to all API routes
};
