#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnvFile(path.resolve(__dirname, "..", ".env.local"));

const {
  MONGODB_URI,
  DB_CSW_NAME,
  MONGODB_DB,
  SUPER_USER_MAIL,
  SUPER_USER_PASSWORD,
} = process.env;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI environment variable.");
  process.exit(1);
}

if (!SUPER_USER_MAIL || !SUPER_USER_PASSWORD) {
  console.error("SUPER_USER_MAIL and SUPER_USER_PASSWORD must be set in your environment.");
  process.exit(1);
}

async function main() {
  const connectionOptions = {
    bufferCommands: false,
    ...((DB_CSW_NAME || MONGODB_DB) ? { dbName: DB_CSW_NAME ?? MONGODB_DB } : {}),
  };

  await mongoose.connect(MONGODB_URI, connectionOptions);

  const userSchema = new mongoose.Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
      passwordHash: { type: String, required: true },
      name: { type: String, trim: true },
      roles: { type: [String], default: [] },
      refreshTokenVersion: { type: Number, default: 0 },
      resetTokenVersion: { type: Number, default: 0 },
    },
    { timestamps: true },
  );

  const UserModel = mongoose.models.User ?? mongoose.model("User", userSchema);

  const email = SUPER_USER_MAIL.toLowerCase();
  const existingUser = await UserModel.findOne({ email }).exec();

  const passwordHash = await bcrypt.hash(SUPER_USER_PASSWORD, 12);

  if (existingUser) {
    const shouldUpdate = !(await bcrypt.compare(SUPER_USER_PASSWORD, existingUser.passwordHash));
    if (shouldUpdate) {
      existingUser.passwordHash = passwordHash;
      existingUser.roles = Array.from(new Set([...(existingUser.roles ?? []), "super-admin"]));
      await existingUser.save();
      console.log(`Updated existing super user password and roles for ${email}`);
    } else {
      if (!existingUser.roles?.includes("super-admin")) {
        existingUser.roles = [...(existingUser.roles ?? []), "super-admin"];
        await existingUser.save();
        console.log(`Added super-admin role to existing user ${email}`);
      } else {
        console.log(`Super user ${email} already exists. No changes needed.`);
      }
    }
  } else {
    await UserModel.create({
      email,
      passwordHash,
      roles: ["super-admin"],
      name: "Super Admin",
    });
    console.log(`Created super user ${email}`);
  }

  await mongoose.disconnect();
}

main()
  .then(() => {
    console.log("Seeding complete.");
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Failed to seed super user:", error);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf-8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
