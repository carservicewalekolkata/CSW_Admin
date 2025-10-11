/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Types } from "mongoose";
import { GridFSBucket } from "mongodb";

export async function GET(
  req: NextRequest,
  context: RouteContext<"/api/cars/brands/icon/[id]">
): Promise<NextResponse<unknown>> {
  try {
    const { id } = await context.params;

    const mongooseInstance = await connectToDatabase();
    const db = mongooseInstance.connection.db;
    if (!db) throw new Error("No active DB connection");

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid file ID" },
        { status: 400 }
      );
    }

    const bucket = new GridFSBucket(db, { bucketName: "fs" });
    const objectId = new Types.ObjectId(id);

    const fileDoc = await db.collection("fs.files").findOne({ _id: objectId });
    if (!fileDoc) {
      return NextResponse.json(
        { success: false, message: "File not found" },
        { status: 404 }
      );
    }

    // --- Detect content type automatically
    const filename = fileDoc.filename || "";
    const contentType =
      fileDoc.contentType ||
      (filename.endsWith(".jpg") || filename.endsWith(".jpeg")
        ? "image/jpeg"
        : filename.endsWith(".webp")
        ? "image/webp"
        : filename.endsWith(".png")
        ? "image/png"
        : "application/octet-stream");

    // --- Stream file
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = bucket.openDownloadStream(objectId);
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    console.error("❌ Error fetching GridFS file:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
