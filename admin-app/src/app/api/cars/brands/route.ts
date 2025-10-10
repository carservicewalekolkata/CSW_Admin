import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { getBrandModel } from "@/models";

type RawBrand = {
  id: number;
  name: string;
  slug: string;
  status?: boolean;
  icon?: unknown;
  created_date?: Date | string;
  updated_date?: Date | string;
};

const normalizeDate = (value?: Date | string): string | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export async function GET() {
  try {
    const mongooseInstance = await connectToDatabase();
    const connection = mongooseInstance.connection;

    if (!connection?.db) {
      throw new Error("No active MongoDB connection");
    }

    const Brand = getBrandModel(connection);
    const brands = await Brand.find({})
      .sort({ id: 1 })
      .select(["id", "name", "slug", "status", "icon", "created_date", "updated_date"])
      .lean<RawBrand[]>();

    return NextResponse.json(
      {
        success: true,
        count: brands.length,
        timestamp: new Date().toISOString(),
        data: brands.map((brand) => ({
          name: brand.name,
          slug: brand.slug,
          status: Boolean(brand.status),
          icon: brand.icon
            ? `/api/cars/brands/icon/${brand.icon}`
            : null,
          created_date: normalizeDate(brand.created_date),
          updated_date: normalizeDate(brand.updated_date),
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: any) {
    console.error("❌ Error in /api/cars/brands:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal Server Error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const mongooseInstance = await connectToDatabase();
    const connection = mongooseInstance.connection;

    if (!connection?.db) {
      throw new Error("No active MongoDB connection");
    }

    const payload = await request.json().catch(() => null);
    const slug =
      typeof payload?.slug === "string" ? payload.slug.trim().toLowerCase() : undefined;

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Brand slug is required" },
        { status: 400 },
      );
    }

    const Brand = getBrandModel(connection);
    const deleted = await Brand.findOneAndDelete({ slug });

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Brand not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Brand deleted successfully",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: any) {
    console.error("❌ Error deleting brand:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to delete brand",
      },
      { status: 500 },
    );
  }
}
