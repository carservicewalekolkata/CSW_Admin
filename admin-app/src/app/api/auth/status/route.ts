import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";

export async function GET() {
  try {
    await connectToDatabase();

    return NextResponse.json(
      { connected: true },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("MongoDB connection check failed", error);

    return NextResponse.json(
      {
        connected: false,
        message: "Unable to connect to the database. Please try again later.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
