/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Types } from "mongoose";
import { GridFSBucket } from "mongodb";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const mongooseInstance = await connectToDatabase();
    const db = mongooseInstance.connection.db;
    if (!db) throw new Error("No active DB connection");

    const fileId = params.id;
    if (!Types.ObjectId.isValid(fileId)) {
      return NextResponse.json({ success: false, message: "Invalid file ID" }, { status: 400 });
    }

    const bucket = new GridFSBucket(db, { bucketName: "fs" });
    const objectId = new Types.ObjectId(fileId);

    const fileDoc = await db.collection("fs.files").findOne({ _id: objectId });
    if (!fileDoc) {
      return NextResponse.json({ success: false, message: "File not found" }, { status: 404 });
    }

    const contentType = fileDoc.contentType || "image/png";
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
