import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key"; // Make sure it's defined

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            return NextResponse.json({ message: "Access Denied. No token provided." }, { status: 401 });
        }

        const token = authHeader.split(" ")[1]; // Extract token

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        return NextResponse.json({ message: "Access granted!", user: decoded }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Invalid or expired token." }, { status: 403 });
    }
}
