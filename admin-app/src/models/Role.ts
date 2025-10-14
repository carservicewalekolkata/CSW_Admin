import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

import { ROLE_PERMISSION_TABLE_IDS } from "@/constants/roles";

const permissionSchema = new Schema(
  {
    table: {
      type: String,
      required: true,
      enum: ROLE_PERMISSION_TABLE_IDS,
    },
    canView: {
      type: Boolean,
      default: true,
    },
    canEdit: {
      type: Boolean,
      default: false,
    },
    canDelete: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const normalizeEmailList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }

    const email = entry.trim().toLowerCase();
    if (!email) {
      continue;
    }

    if (seen.has(email)) {
      continue;
    }

    seen.add(email);
    normalized.push(email);
  }

  return normalized;
};

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    members: {
      type: [String],
      default: [],
      set: normalizeEmailList,
    },
    permissions: {
      type: [permissionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

roleSchema.index(
  { name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
  },
);

export type Role = InferSchemaType<typeof roleSchema>;
export type RoleDocument = HydratedDocument<Role>;

export const RoleModel = models.Role ?? model<Role>("Role", roleSchema);
