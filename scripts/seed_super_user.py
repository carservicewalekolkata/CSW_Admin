"""Seed or update a CSW super admin user in MongoDB."""

from __future__ import annotations

import os
import sys
from datetime import UTC, datetime
from typing import Any, Dict, Optional

import bcrypt
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import ConfigurationError, PyMongoError


REQUIRED_ENV_KEYS = ("MONGODB_URI", "SUPER_USER_MAIL", "SUPER_USER_PASSWORD")


def _get_required_env(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise SystemExit(f"Missing {key} environment variable.")
    return value


def _resolve_database(client: MongoClient) -> Database:
    db_name = os.getenv("DB_CSW_NAME") or os.getenv("MONGODB_DB")

    if db_name:
        return client.get_database(db_name)

    try:
        return client.get_default_database()
    except ConfigurationError as exc:  # pragma: no cover - informative failure path
        raise SystemExit(
            "MongoDB database name not provided. Set DB_CSW_NAME or include it in MONGODB_URI."
        ) from exc


def _ensure_super_admin(users: Collection, email: str, password: str) -> None:
    now = datetime.now(UTC)
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

    existing: Optional[Dict[str, Any]] = users.find_one({"email": email})
    if existing:
        updates: Dict[str, Any] = {}

        stored_hash = existing.get("passwordHash")
        if not stored_hash or not bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8")):
            updates["passwordHash"] = hashed_password

        roles = set(existing.get("roles", []))
        if "super-admin" not in roles:
            roles.add("super-admin")
            updates["roles"] = sorted(roles)

        if updates:
            updates["updatedAt"] = now
            users.update_one({"_id": existing["_id"]}, {"$set": updates})
            print(f"Updated super admin user {email}")
        else:
            print(f"Super admin user {email} already up to date")
        return

    document = {
        "email": email,
        "passwordHash": hashed_password,
        "roles": ["super-admin"],
        "name": "Super Admin",
        "refreshTokenVersion": 0,
        "resetTokenVersion": 0,
        "createdAt": now,
        "updatedAt": now,
    }
    users.insert_one(document)
    print(f"Created super admin user {email}")


def main() -> None:
    for key in REQUIRED_ENV_KEYS:
        _get_required_env(key)

    uri = os.environ["MONGODB_URI"]
    email = os.environ["SUPER_USER_MAIL"].strip().lower()
    password = os.environ["SUPER_USER_PASSWORD"]

    client = MongoClient(uri, tz_aware=True)
    try:
        database = _resolve_database(client)
        users_collection = database.get_collection("users")
        _ensure_super_admin(users_collection, email, password)
    except PyMongoError as exc:
        raise SystemExit(f"Failed to seed super admin: {exc}") from exc
    finally:
        client.close()


if __name__ == "__main__":
    try:
        main()
    except SystemExit as exc:
        print(exc, file=sys.stderr)
        raise
