import json
import os
import re
import requests
import threading
import concurrent.futures as ThreadManager
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse
from datetime import datetime, UTC

from dotenv import load_dotenv
from requests.adapters import HTTPAdapter, Retry

from pymongo import MongoClient, ReturnDocument

from gridfs import GridFS


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
ADMIN_APP_PUBLIC_DIR = PROJECT_ROOT / "admin-app" / "public"
PUBLIC_ASSETS_DIR = ADMIN_APP_PUBLIC_DIR / "assets"
PUBLIC_ASSETS_RELATIVE = PurePosixPath("assets")
ASSETS_MODELS_DIR = PUBLIC_ASSETS_DIR / "images" / "models"
ASSETS_MODELS_RELATIVE = PUBLIC_ASSETS_RELATIVE / "images" / "models"
BATTERY_SERVICES_DIR = PUBLIC_ASSETS_DIR / "services" / "batteries"
BATTERY_SERVICES_RELATIVE = PUBLIC_ASSETS_RELATIVE / "services" / "batteries"
SERVICES_CACHE_PATH = PUBLIC_ASSETS_DIR / "services_cache.json"


def resolve_public_asset_path(relative_path):
  """
  Resolve a relative asset path like 'assets/...' to the admin app public directory.
  Handles already-absolute paths by returning them unchanged.
  """
  candidate = Path(relative_path)
  if candidate.is_absolute():
    return candidate
  relative_parts = PurePosixPath(str(relative_path)).parts
  return ADMIN_APP_PUBLIC_DIR.joinpath(*relative_parts)


def _load_environment():
  """Load optional .env files for local use without overriding host environment."""
  env_loaded = False
  script_dir = SCRIPT_DIR
  project_root = PROJECT_ROOT
  admin_app_dir = ADMIN_APP_PUBLIC_DIR.parent

  for base_dir in (script_dir, project_root, admin_app_dir):
    if not base_dir.exists():
      continue
    for file_name in (".env.local", ".env"):
      candidate = base_dir / file_name
      if candidate.exists():
        load_dotenv(candidate, override=False)
        env_loaded = True

  if not env_loaded:
    print("No .env file found; relying on operating system environment variables.")


_load_environment()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
  raise SystemExit("Missing MONGODB_URI environment variable – export it locally or inject it into the container image.")

BASE_URL = "https://gomechanic.app/api"
BASE_URL_2 = "https://gomechanic.in/api"

BRAND_ROUTE = "/v1/get-brands"
MODEL_ROUTE = "/v2/oauth/vehicles/get_models_by_brand/?brand_id={}"
SERVICES_ROUTE = "/v2/oauth/customer/get-services-details-by-category?car_id={}&city_id=144&category_id={}"

VALID_CATEGORY_IDS = [
  "0",  # Car services
  "13",  # AC Services & repairs
  "-4",  # Batteries
  "21",  # Tyres and wheels care
  "16",  # Denting and Painting
  "37",  # Detailing
]

CATEGORY_LABELS = {
  "0": "Car services",
  "13": "AC Services & repairs",
  "-4": "Batteries",
  "21": "Tyres and wheels care",
  "16": "Denting and Painting",
  "37": "Detailing",
}

client = MongoClient(MONGODB_URI)

db_name = os.getenv("DB_CSW_NAME") or os.getenv("MONGODB_DB") or "cswdb"
db = client[db_name]

# Create/use collections
brands = db["brand"]
models = db["models"]
service_categories = db["service_categories"]
services = db["services"]

def get_next_sequence(db, name, start_at=1):
  counter = db.counters.find_one_and_update(
      {"_id": name},
      [
        {
          "$set": {
            "seq": {
              "$add": [
                {"$ifNull": ["$seq", start_at - 1]},
                1
              ]
            }
          }
        }
      ],
      upsert=True,
      return_document=ReturnDocument.AFTER
  )
  if not counter or "seq" not in counter:
    return start_at
  return counter["seq"]

class CSW:

  def __init__(self):
    token = os.getenv("GOMECHANIC_BEARER_TOKEN")
    self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    self.api_headers = {
      "Accept": "application/json",
      "User-Agent": self.user_agent
    }
    if token:
      self.api_headers["Authorization"] = f"Bearer {token}"

    self.asset_headers = {
      "Accept": "*/*",
      "User-Agent": self.user_agent
    }

    self.models = dict()
    self.prices = dict()

    self._thread_local = threading.local()

    self._brand_lookup_lock = threading.Lock()
    self._brand_api_by_doc_id = {}
    self._brand_api_by_slug = {}
    self._brand_api_by_name = {}
    self._brand_lookup_populated = False

  def _create_session(self, include_auth=True):
    session = requests.Session()
    headers = self.api_headers if include_auth else self.asset_headers
    session.headers.update(headers)
    retry_strategy = Retry(
      total=5,
      backoff_factor=0.5,
      status_forcelist=[429, 500, 502, 503, 504],
      allowed_methods=["HEAD", "GET", "OPTIONS"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

  def _get_session(self):
    if not hasattr(self._thread_local, "api_session"):
      self._thread_local.api_session = self._create_session(include_auth=True)
    return self._thread_local.api_session

  def _get_asset_session(self):
    if not hasattr(self._thread_local, "asset_session"):
      self._thread_local.asset_session = self._create_session(include_auth=False)
    return self._thread_local.asset_session

  def _register_brand_lookup(self, doc_id, api_brand_id, brand_name=None, slug_candidates=None):
    if api_brand_id is None:
      return

    normalized_slugs = []
    for value in slug_candidates or []:
      if value is None:
        continue
      normalized = str(value).strip().lower()
      if normalized:
        normalized_slugs.append(normalized)

    normalized_name = None
    if brand_name:
      candidate = str(brand_name).strip().lower()
      if candidate:
        normalized_name = candidate

    with self._brand_lookup_lock:
      self._brand_api_by_doc_id[doc_id] = api_brand_id
      for slug_value in normalized_slugs:
        self._brand_api_by_slug[slug_value] = api_brand_id
      if normalized_name:
        self._brand_api_by_name[normalized_name] = api_brand_id

  def _ensure_brand_lookup_from_api(self):
    with self._brand_lookup_lock:
      if self._brand_lookup_populated:
        return

    try:
      session = self._get_session()
      resp = session.get(BASE_URL_2 + BRAND_ROUTE, timeout=10)
      resp.raise_for_status()
      data = resp.json().get("data", [])
    except Exception as err:
      print(f"[!] Failed to populate brand lookup from API: {err}")
      return

    with self._brand_lookup_lock:
      for brand in data:
        api_brand_raw_id = brand.get("id") or brand.get("brand_id")
        if api_brand_raw_id is None:
          continue
        try:
          api_brand_id = int(api_brand_raw_id)
        except (TypeError, ValueError):
          continue

        slug_candidates = [
          brand.get("slug_id"),
          brand.get("slug")
        ]
        for candidate in slug_candidates:
          if candidate is None:
            continue
          normalized = str(candidate).strip().lower()
          if normalized:
            self._brand_api_by_slug[normalized] = api_brand_id

        brand_name = brand.get("name")
        if brand_name:
          normalized_name = str(brand_name).strip().lower()
          if normalized_name:
            self._brand_api_by_name[normalized_name] = api_brand_id

      self._brand_lookup_populated = True

  def _resolve_api_brand_id(self, brand_doc):
    brand_id = brand_doc.get("id")
    slug_value = str(brand_doc.get("slug") or "").strip().lower()
    brand_name = str(brand_doc.get("name") or "").strip().lower()

    with self._brand_lookup_lock:
      if brand_id in self._brand_api_by_doc_id:
        return self._brand_api_by_doc_id[brand_id]
      if slug_value and slug_value in self._brand_api_by_slug:
        api_id = self._brand_api_by_slug[slug_value]
        self._brand_api_by_doc_id[brand_id] = api_id
        return api_id
      if brand_name and brand_name in self._brand_api_by_name:
        api_id = self._brand_api_by_name[brand_name]
        self._brand_api_by_doc_id[brand_id] = api_id
        return api_id

    self._ensure_brand_lookup_from_api()

    with self._brand_lookup_lock:
      if brand_id in self._brand_api_by_doc_id:
        return self._brand_api_by_doc_id[brand_id]
      if slug_value and slug_value in self._brand_api_by_slug:
        api_id = self._brand_api_by_slug[slug_value]
        self._brand_api_by_doc_id[brand_id] = api_id
        return api_id
      if brand_name and brand_name in self._brand_api_by_name:
        api_id = self._brand_api_by_name[brand_name]
        self._brand_api_by_doc_id[brand_id] = api_id
        return api_id

    return None

  def _sanitize_filename(self, value, fallback):
    candidate = str(value or fallback)
    candidate = re.sub(r"[^A-Za-z0-9_.-]+", "-", candidate).strip("-")
    return candidate or str(fallback)

  def _parse_numeric(self, value):
    if value is None:
      return 0.0
    if isinstance(value, (int, float)):
      return float(value)
    if isinstance(value, str):
      cleaned = value.strip()
      if not cleaned:
        return 0.0
      cleaned = cleaned.replace(",", "")
      cleaned = re.sub(r"[^0-9.\-]", "", cleaned)
      if cleaned in {"", "-", "."}:
        return 0.0
      try:
        return float(cleaned)
      except ValueError:
        return 0.0
    return 0.0

  def validate_collections(self, db):
    """
    Create collections with schema validation:
    - brands (incremental ids from 80)
    - models (incremental ids from 220)
    - service_categories (incremental ids from 1)
    - services (ObjectId + foreign keys to model_id and category_id)
    """

    # ---------------- BRAND ----------------
    brand_validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "name", "slug", "icon", "status", "created_date", "updated_date"],
            "properties": {
                "id": {"bsonType": "int"},
                "name": {"bsonType": "string"},
                "slug": {"bsonType": "string"},
                "icon": {"bsonType": ["objectId", "null"]},
                "status": {"bsonType": "bool"},
                "created_date": {"bsonType": "date"},
                "updated_date": {"bsonType": "date"}
            }
        }
    }

    # ---------------- MODEL ----------------
    model_validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "name", "brand_id", "brand_name", "fuel_type",
                         "slug", "services", "status", "created_date", "updated_date"],
            "properties": {
                "id": {"bsonType": "int"},
                "name": {"bsonType": "string"},
                "thumbnail": {"bsonType": ["objectId", "null"]},
                "image": {"bsonType": "string"},
                "body_type": {"bsonType": ["string", "null"]},
                "brand_id": {"bsonType": "int"},
                "brand_name": {"bsonType": "string"},
                "fuel_type": {
                    "bsonType": "array",
                    "items": {"bsonType": "string"}
                },
                "slug": {"bsonType": "string"},
                "services": {
                    "bsonType": "array",
                    "items": {
                        "bsonType": "object",
                        "required": ["services_id", "discount", "original_price", "discount_price"],
                        "properties": {
                            "services_id": {"bsonType": "objectId"},
                            "discount": {"bsonType": "double"},
                            "original_price": {"bsonType": "double"},
                            "discount_price": {"bsonType": "double"}
                        }
                    }
                },
                "status": {"bsonType": "bool"},
                "created_date": {"bsonType": "date"},
                "updated_date": {"bsonType": "date"}
            }
        }
    }

    # ---------------- SERVICE CATEGORY ----------------
    service_category_validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["id", "name", "created_date", "updated_date"],
            "properties": {
                "id": {"bsonType": "int"},   # internal incremental id (starts at 1)
                "name": {"bsonType": "string"},
                "created_date": {"bsonType": "date"},
                "updated_date": {"bsonType": "date"}
            }
        }
    }

    # ---------------- SERVICE ----------------
    service_validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["name", "category_id", "features", "status",
                         "created_date", "updated_date"],
            "properties": {
                "name": {"bsonType": "string"},
                "category_id": {"bsonType": "int"},   # FK → service_categories.id
                "category_name": {"bsonType": "string"},
                "service_images": {
                    "bsonType": "array",
                    "items": {"bsonType": "string"}
                },
                "thumbnail": {"bsonType": "string"},
                "description": {"bsonType": ["string", "null"]},
                "features": {
                    "bsonType": "array",
                    "items": {"bsonType": "string"}
                },
                "time_taken": {"bsonType": ["string", "null"]},
                "warranty": {"bsonType": ["null", "string"]},
                "status": {"bsonType": "bool"},
                "created_date": {"bsonType": "date"},
                "updated_date": {"bsonType": "date"}
            }
        }
    }

    # Create or update collections with validators
    for name, validator in {
        "brands": brand_validator,
        "models": model_validator,
        "service_categories": service_category_validator,
        "services": service_validator
    }.items():
        try:
            db.create_collection(name, validator=validator)
            print(f"[+] Created collection {name} with schema validation.")
        except Exception:
            db.command("collMod", name, validator=validator)
            print(f"[~] Updated validator for {name}.")

  def fetch_brands(self, db):
    """
    Fetch brand data from API, download icon, store in GridFS, and upsert into MongoDB.
    """
    fs = GridFS(db)
    api_session = self._get_session()

    url = BASE_URL_2 + BRAND_ROUTE
    resp = api_session.get(url, timeout=10)
    resp.raise_for_status()

    data = resp.json().get("data", [])
    print(f"[+] Got {len(data)} brands from API")

    print_lock = threading.Lock()

    def log(message):
      with print_lock:
        print(message)

    def process_brand(payload):
      index, brand = payload
      asset_session = self._get_asset_session()
      now = datetime.now(UTC)

      api_brand_raw_id = brand.get("id") or brand.get("brand_id")
      api_brand_id = None
      if api_brand_raw_id is not None:
        try:
          api_brand_id = int(api_brand_raw_id)
        except (TypeError, ValueError):
          log(f"[!] Non-numeric API brand id {api_brand_raw_id} for {brand.get('name')}")

      lookup_projection = {"icon": 1, "created_date": 1, "id": 1}
      existing_doc = None
      try:
        if api_brand_id is not None:
          existing_doc = db.brands.find_one({"api_id": api_brand_id}, lookup_projection)
        if existing_doc is None:
          slug_candidate = brand.get("slug_id") or brand.get("slug")
          if slug_candidate:
            existing_doc = db.brands.find_one({"slug": slug_candidate}, lookup_projection)
        if existing_doc is None and brand.get("name"):
          existing_doc = db.brands.find_one({"name": brand.get("name")}, lookup_projection)
      except Exception as lookup_err:
        log(f"[!] Failed to query existing brand record for {brand.get('name')}: {lookup_err}")
        existing_doc = None

      if existing_doc:
        doc_id = existing_doc.get("id")
      else:
        doc_id = get_next_sequence(db, "brand_id", start_at=80)
        log(f"[i] Assigned incremental brand id {doc_id} to {brand.get('name')}")

      slug_value = brand.get("slug_id") or brand.get("slug") or self._sanitize_filename(brand.get("name"), doc_id)

      old_icon_id = existing_doc.get("icon") if existing_doc else None
      icon_for_doc = old_icon_id

      icon_url = brand.get("icon")
      new_icon_id = None
      if icon_url:
        try:
          log(f"[+] Downloading icon for {brand.get('name')} -> {icon_url}")
          icon_resp = asset_session.get(icon_url, timeout=15)
          icon_resp.raise_for_status()
          filename = f"{self._sanitize_filename(slug_value, doc_id)}_icon"
          new_icon_id = fs.put(icon_resp.content, filename=filename, contentType="image/png")
          icon_for_doc = new_icon_id
        except Exception as err:
          log(f"[!] Failed to fetch/store icon for {brand.get('name')}: {err}")
      else:
        icon_for_doc = None

      if old_icon_id and icon_for_doc != old_icon_id:
        try:
          fs.delete(old_icon_id)
          log(f"[i] Removed previous icon for brand id {doc_id}")
        except Exception as delete_err:
          log(f"[!] Failed to delete old icon for brand id {doc_id}: {delete_err}")

      doc = {
        "id": doc_id,
        "name": brand.get("name"),
        "slug": slug_value,
        "icon": icon_for_doc,
        "status": bool(True),
        "updated_date": now
      }

      slug_candidates_for_lookup = [
        brand.get("slug_id"),
        brand.get("slug"),
        slug_value
      ]
      self._register_brand_lookup(
        doc_id,
        api_brand_id,
        brand_name=brand.get("name"),
        slug_candidates=slug_candidates_for_lookup
      )

      log(f"Brand doc: {doc}")

      update_payload = {"$set": doc, "$unset": {"api_id": ""}}

      if existing_doc is None:
        update_payload["$setOnInsert"] = {"created_date": now}
      elif not existing_doc.get("created_date"):
        update_payload["$set"]["created_date"] = now

      db.brands.update_one({"id": doc_id}, update_payload, upsert=True)

    with ThreadManager.ThreadPoolExecutor(max_workers=min(8, (os.cpu_count() or 4))) as executor:
      list(executor.map(process_brand, enumerate(data, start=1)))

    with self._brand_lookup_lock:
      self._brand_lookup_populated = True

    print("[+] Brands synced to MongoDB")

  def fetch_models(self, db):
    """
    Fetch model data by brand, manage thumbnails in GridFS, download hero images locally,
    and upsert into MongoDB with foreign key reference to brands.
    """
    fs = GridFS(db)
    ASSETS_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    BATTERY_SERVICES_DIR.mkdir(parents=True, exist_ok=True)
    SERVICES_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)

    print_lock = threading.Lock()

    def log(message):
      with print_lock:
        print(message)

    category_cache = {}
    category_cache_lock = threading.Lock()
    service_registry = {}
    service_registry_lock = threading.Lock()
    services_cache_data = {}
    battery_thumbnail_cache = {}
    battery_thumbnail_lock = threading.Lock()

    try:
      existing_services = db.services.find(
        {},
        {"_id": 1, "category_id": 1, "name": 1, "category_name": 1, "status": 1}
      )
      for service_doc in existing_services:
        category_id_value = service_doc.get("category_id")
        service_name_value = service_doc.get("name")
        if category_id_value is None or not service_name_value:
          continue
        service_key = f"{category_id_value}:{str(service_name_value).strip().lower()}"
        service_registry[service_key] = service_doc["_id"]
        category_cache_entry = services_cache_data.setdefault(str(category_id_value), {})
        category_cache_entry[str(service_name_value)] = {
          "service_id": str(service_doc["_id"]),
          "category_name": service_doc.get("category_name"),
          "status": bool(service_doc.get("status", True))
        }
    except Exception as preload_err:
      log(f"[!] Failed to preload existing services: {preload_err}")

    def flush_services_cache():
      try:
        SERVICES_CACHE_PATH.write_text(
          json.dumps(services_cache_data, indent=2, ensure_ascii=False),
          encoding="utf-8"
        )
      except Exception as cache_err:
        log(f"[!] Failed to write services cache file: {cache_err}")

    flush_services_cache()

    def normalize_features(raw):
      if not raw:
        return []
      features = []
      if isinstance(raw, list):
        for entry in raw:
          if isinstance(entry, str):
            text = entry.strip()
          elif isinstance(entry, dict):
            text = entry.get("name") or entry.get("title") or entry.get("value")
            if isinstance(text, list):
              text = ", ".join(str(item).strip() for item in text if str(item).strip())
          else:
            text = str(entry)
          if text:
            features.append(str(text))
      elif isinstance(raw, str):
        for chunk in raw.splitlines():
          chunk = chunk.strip()
          if chunk:
            features.append(chunk)
      return features

    def pick_battery_image_url(service_entry):
      if not isinstance(service_entry, dict):
        return None
      for key in ("image1_url", "image2_url", "image3_url"):
        candidate = service_entry.get(key)
        if not candidate:
          continue
        text = str(candidate).strip()
        if text:
          return text
      return None

    def store_battery_thumbnail(asset_session, image_url, model_id, service_name):
      if not image_url:
        return None

      parsed = urlparse(image_url)
      suffix = Path(parsed.path).suffix.lower()
      if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        suffix = ".jpg"

      service_part = self._sanitize_filename(service_name, "battery-service")
      filename = f"{service_part}{suffix}"
      local_path = BATTERY_SERVICES_DIR.joinpath(filename)
      relative_path = (BATTERY_SERVICES_RELATIVE / filename).as_posix()

      with battery_thumbnail_lock:
        cached_path = battery_thumbnail_cache.get(service_part)
      if cached_path:
        cached_file = resolve_public_asset_path(cached_path)
        try:
          if cached_file.exists() and cached_file.stat().st_size > 0:
            return cached_path
        except OSError:
          pass
        with battery_thumbnail_lock:
          battery_thumbnail_cache.pop(service_part, None)

      try:
        if local_path.exists() and local_path.stat().st_size > 0:
          with battery_thumbnail_lock:
            battery_thumbnail_cache.setdefault(service_part, relative_path)
          return relative_path
      except OSError:
        pass

      try:
        response = asset_session.get(image_url, timeout=20)
        response.raise_for_status()
      except Exception as fetch_err:
        log(f"[!] Failed to download battery thumbnail for {service_name} (model {model_id}): {fetch_err}")
        return None

      temp_path = local_path.parent.joinpath(f"{filename}.{threading.get_ident()}.tmp")

      try:
        temp_path.write_bytes(response.content)
        temp_path.replace(local_path)
      except Exception as io_err:
        log(f"[!] Failed to store battery thumbnail for {service_name} (model {model_id}): {io_err}")
        try:
          if temp_path.exists():
            temp_path.unlink()
        except Exception:
          pass
        return None

      with battery_thumbnail_lock:
        battery_thumbnail_cache[service_part] = relative_path
      return relative_path

    def ensure_service_category(category_api_id, category_name, category_key=None):
      preferred_label = None
      if category_key is not None and category_key in CATEGORY_LABELS:
        preferred_label = CATEGORY_LABELS[category_key]
      elif category_api_id is not None and str(category_api_id) in CATEGORY_LABELS:
        preferred_label = CATEGORY_LABELS[str(category_api_id)]

      fallback_label = str(category_name or f"Category {category_api_id if category_api_id is not None else 'unknown'}").strip()
      if not fallback_label:
        fallback_label = f"Category {category_api_id if category_api_id is not None else 'unknown'}"

      normalized_name = preferred_label or fallback_label
      cache_key = f"api:{category_api_id}" if category_api_id is not None else f"name:{normalized_name.lower()}"

      with category_cache_lock:
        cached_identifier = category_cache.get(cache_key)
        if cached_identifier:
          return cached_identifier

        filter_doc = {"api_id": category_api_id} if category_api_id is not None else {"name": normalized_name}
        try:
          existing = db.service_categories.find_one(filter_doc, {"id": 1})
        except Exception as lookup_err:
          log(f"[!] Failed to query service category {normalized_name}: {lookup_err}")
          existing = None

        if existing:
          category_cache[cache_key] = existing["id"]
          return existing["id"]

        new_id = get_next_sequence(db, "service_category_id", start_at=1)
        now_local = datetime.now(UTC)
        update_payload = {
          "$setOnInsert": {
            "id": new_id,
            "created_date": now_local
          },
          "$set": {
            "api_id": category_api_id,
            "name": normalized_name,
            "updated_date": now_local
          }
        }

        try:
          db.service_categories.update_one(filter_doc, update_payload, upsert=True)
        except Exception as upsert_err:
          log(f"[!] Failed to upsert service category {normalized_name}: {upsert_err}")
          try:
            fallback = db.service_categories.find_one(filter_doc, {"id": 1})
          except Exception:
            fallback = None
          if fallback:
            category_cache[cache_key] = fallback["id"]
            return fallback["id"]
          category_cache[cache_key] = new_id
          return new_id

        category_cache[cache_key] = new_id
        return new_id

    def ensure_service_document(category_internal_id, category_display_name, service_name,
                                service_entry, features, time_taken, status_flag,
                                thumbnail_path=None):
      if not service_name:
        return None

      service_key = f"{category_internal_id}:{service_name.lower()}"
      now_local = datetime.now(UTC)

      with service_registry_lock:
        known_service_id = service_registry.get(service_key)

      description_value = service_entry.get("description") if isinstance(service_entry, dict) else None
      description = str(description_value).strip() if isinstance(description_value, str) else description_value or None

      warranty_value = service_entry.get("warranty") if isinstance(service_entry, dict) else None
      if isinstance(warranty_value, (list, dict, tuple)):
        warranty = None
      elif warranty_value is None:
        warranty = None
      else:
        warranty = str(warranty_value).strip()

      service_doc = {
        "name": service_name,
        "category_id": category_internal_id,
        "category_name": category_display_name,
        "service_images": [],
        "description": description,
        "features": features,
        "time_taken": time_taken,
        "warranty": warranty,
        "status": status_flag,
        "updated_date": now_local
      }

      if thumbnail_path is not None:
        service_doc["thumbnail"] = thumbnail_path
      elif known_service_id is None:
        service_doc["thumbnail"] = ""

      filter_doc = {"_id": known_service_id} if known_service_id else {"category_id": category_internal_id, "name": service_name}
      service_id = None
      try:
        update_payload = {
          "$set": service_doc,
          "$setOnInsert": {"created_date": now_local}
        }
        result = db.services.update_one(filter_doc, update_payload, upsert=True)
        if known_service_id is not None:
          service_id = known_service_id
        elif result.upserted_id is not None:
          service_id = result.upserted_id
        else:
          lookup = db.services.find_one(filter_doc, {"_id": 1})
          if lookup:
            service_id = lookup.get("_id")
      except Exception as upsert_err:
        log(f"[!] Failed to upsert service {service_name} (category {category_internal_id}): {upsert_err}")
        return None

      if service_id is None:
        return None

      with service_registry_lock:
        services_cache_data.setdefault(str(category_internal_id), {})[service_name] = {
          "service_id": str(service_id),
          "category_name": category_display_name,
          "status": status_flag
        }
        service_registry[service_key] = service_id
        flush_services_cache()

      return service_id

    def sync_services_for_model(api_session, asset_session, api_model_id, model_id, model_label):
      model_services_map = {}
      for category_param in VALID_CATEGORY_IDS:
        try:
          resp = api_session.get(BASE_URL + SERVICES_ROUTE.format(api_model_id, category_param), timeout=25)
          resp.raise_for_status()
        except Exception as err:
          log(f"[!] Failed to fetch services for {model_label} ({api_model_id}) category {category_param}: {err}")
          continue

        payload = resp.json()
        categories_payload = payload.get("data") or []
        if isinstance(categories_payload, dict):
          categories_iter = [categories_payload]
        elif isinstance(categories_payload, list):
          categories_iter = categories_payload
        else:
          continue

        for category_entry in categories_iter:
          category_name_value = category_entry.get("name")
          category_name = str(category_name_value).strip() if category_name_value else f"Category {category_param}"
          category_api_raw = category_entry.get("category_id")
          try:
            category_api_id = int(category_api_raw) if category_api_raw is not None else None
          except (TypeError, ValueError):
            category_api_id = None

          category_internal_id = ensure_service_category(category_api_id, category_name, category_param)
          category_display_name = CATEGORY_LABELS.get(category_param)
          if category_display_name is None and category_api_id is not None:
            category_display_name = CATEGORY_LABELS.get(str(category_api_id))
          if category_display_name is None:
            category_display_name = category_name
          services_list = category_entry.get("services") or []
          if not isinstance(services_list, list):
            continue

          processed = 0
          is_battery_category = (category_param == "-4") or (category_api_id == -4)
          for service_entry in services_list:
            service_name_value = service_entry.get("name") or service_entry.get("service_name")
            base_service_name = str(service_name_value).strip() if service_name_value else None
            if not base_service_name:
              continue

            thumbnail_local_path = None

            if is_battery_category:
              service_name = f"{base_service_name} Battery"
              original_price = self._parse_numeric(service_entry.get("strike_through"))
              discount_text = service_entry.get("discount_text")
              if discount_text is not None and str(discount_text).strip():
                discount_base = self._parse_numeric(discount_text)
                discount = discount_base + 1.0
              else:
                discount = 0.0
              discounted_price_calc = original_price * (1 - (discount / 100.0)) if original_price else 0.0
              discounted_price = discounted_price_calc if discounted_price_calc >= 0 else 0.0
              time_taken = None
              features_seed = []
              ampere_value = service_entry.get("ampere")
              if ampere_value not in (None, ""):
                features_seed.append(ampere_value)
              inclusion_raw = service_entry.get("inclusion")
              if isinstance(inclusion_raw, list):
                features_seed.extend(inclusion_raw)
              elif inclusion_raw:
                features_seed.append(inclusion_raw)
              features = normalize_features(features_seed)
              service_payload = dict(service_entry)
              service_payload["description"] = service_entry.get("brand_description")
              thumbnail_source_url = pick_battery_image_url(service_entry)
              if thumbnail_source_url:
                thumbnail_local_path = store_battery_thumbnail(asset_session, thumbnail_source_url, model_id, service_name)
            else:
              service_name = base_service_name

              package_details = service_entry.get("package_details") or []
              if isinstance(package_details, list):
                package = package_details[0] if package_details else {}
              elif isinstance(package_details, dict):
                package = package_details
              else:
                package = {}
              original_price = self._parse_numeric(package.get("strikethrough"))
              discount = self._parse_numeric(package.get("percentage_amc_discount")) + 1
              discounted_price_calc = original_price * (1 - (discount / 100.0)) if original_price else 0.0
              discounted_price = discounted_price_calc if discounted_price_calc >= 0 else 0.0
              # discounted_price = self._parse_numeric(package.get("total"))

              desc_details = service_entry.get("desc_details") or {}
              features = normalize_features(desc_details.get("inclusion"))
              time_taken = desc_details.get("time_taken")
              if isinstance(time_taken, (list, dict)):
                time_taken = None
              elif isinstance(time_taken, (int, float)):
                time_taken = str(time_taken)
              service_payload = service_entry

            status_raw = service_entry.get("status", True)
            if isinstance(status_raw, bool):
              status_flag = status_raw
            elif isinstance(status_raw, (int, float)):
              status_flag = status_raw != 0
            elif isinstance(status_raw, str):
              status_flag = status_raw.strip().lower() in {"true", "1", "yes", "active"}
            else:
              status_flag = True

            service_id = ensure_service_document(
              category_internal_id,
              category_display_name,
              service_name,
              service_payload,
              features,
              time_taken,
              status_flag,
              thumbnail_local_path
            )

            if service_id is None:
              continue

            processed += 1

            service_summary = {
              "services_id": service_id,
              "discount": discount,
              "original_price": original_price,
              "discount_price": discounted_price
            }
            model_services_map[service_id] = service_summary

          if processed:
            log(f"[+] Synced {processed} services for {model_label} in category {category_name} (internal id {category_internal_id})")

      return list(model_services_map.values())

    brand_records = list(db.brands.find({}, {"id": 1, "slug": 1, "name": 1}))
    if not brand_records:
      print("[!] No brands available. Run fetch_brands first.")
      return

    def process_brand_models(brand_doc):
      api_session = self._get_session()
      asset_session = self._get_asset_session()
      brand_id = brand_doc.get("id")
      brand_name = brand_doc.get("name")
      brand_slug = brand_doc.get("slug") or self._sanitize_filename(brand_name, brand_id)

      api_brand_id = self._resolve_api_brand_id({
        "id": brand_id,
        "slug": brand_slug,
        "name": brand_name
      })

      if api_brand_id is None:
        log(f"[!] Skipping brand {brand_name} ({brand_id}) due to missing API brand id mapping")
        return

      self._register_brand_lookup(
        brand_id,
        api_brand_id,
        brand_name=brand_name,
        slug_candidates=[brand_slug]
      )

      url = BASE_URL + MODEL_ROUTE.format(api_brand_id)
      try:
        resp = api_session.get(url, timeout=15)
        resp.raise_for_status()
      except Exception as err:
        log(f"[!] Failed to fetch models for brand {brand_name} ({api_brand_id}): {err}")
        return

      models_payload = resp.json().get("data", [])
      log(f"[+] Got {len(models_payload)} models for brand {brand_name} ({api_brand_id})")

      for model in models_payload:
        model_raw_id = model.get("id")
        if model_raw_id is None:
          log(f"[!] Skipping model without id for brand {brand_name}")
          continue

        try:
          api_model_id = int(model_raw_id)
        except (TypeError, ValueError):
          log(f"[!] Skipping model with non-numeric id {model_raw_id} for brand {brand_name}")
          continue

        now = datetime.now(UTC)

        lookup_projection = {"thumbnail": 1, "image": 1, "created_date": 1, "id": 1, "brand_name": 1, "services": 1}
        existing_doc = None
        try:
          slug_candidate = model.get("slug")
          if slug_candidate:
            existing_doc = db.models.find_one(
              {"brand_id": brand_id, "slug": slug_candidate},
              lookup_projection
            )
          if existing_doc is None and model.get("name"):
            existing_doc = db.models.find_one(
              {"brand_id": brand_id, "name": model.get("name")},
              lookup_projection
            )
          if existing_doc is None:
            existing_doc = db.models.find_one({"api_id": api_model_id}, lookup_projection)
        except Exception as lookup_err:
          log(f"[!] Failed to query existing model record for API id {api_model_id}: {lookup_err}")
          existing_doc = None

        if existing_doc:
          model_id = existing_doc.get("id")
        else:
          model_id = get_next_sequence(db, "model_id", start_at=220)
          log(f"[i] Assigned incremental model id {model_id} to {model.get('name')} ({api_model_id})")

        model_label = f"{brand_name} - {model.get('name') or api_model_id}"
        model_services = sync_services_for_model(api_session, asset_session, api_model_id, model_id, model_label)

        old_thumbnail_id = existing_doc.get("thumbnail") if existing_doc else None
        thumbnail_for_doc = old_thumbnail_id

        thumbnail_url = model.get("thumbnail")
        new_thumbnail_id = None
        if thumbnail_url:
          try:
            thumb_resp = asset_session.get(thumbnail_url, timeout=20)
            thumb_resp.raise_for_status()
            thumb_name = f"{self._sanitize_filename(brand_slug, brand_id)}_{self._sanitize_filename(model.get('slug'), model_id)}_thumbnail"
            new_thumbnail_id = fs.put(thumb_resp.content, filename=thumb_name, contentType="image/png")
            thumbnail_for_doc = new_thumbnail_id
          except Exception as err:
            log(f"[!] Failed to fetch/store thumbnail for model {model.get('name')} ({model_id}): {err}")
        else:
          thumbnail_for_doc = None

        if old_thumbnail_id and thumbnail_for_doc != old_thumbnail_id:
          try:
            fs.delete(old_thumbnail_id)
            log(f"[i] Removed previous thumbnail for model id {model_id}")
          except Exception as delete_err:
            log(f"[!] Failed to delete old thumbnail for model id {model_id}: {delete_err}")

        image_relative_path = None
        image_url = model.get("image_path")
        old_image_path = existing_doc.get("image") if existing_doc else None

        if image_url:
          try:
            image_resp = asset_session.get(image_url, timeout=25)
            image_resp.raise_for_status()
            parsed = urlparse(image_url)
            suffix = Path(parsed.path).suffix or ".png"
            file_name = f"{self._sanitize_filename(brand_slug, brand_id)}_{self._sanitize_filename(model.get('slug'), model_id)}{suffix}"
            local_path = ASSETS_MODELS_DIR.joinpath(file_name)
            temp_path = local_path.with_suffix(f"{local_path.suffix}.tmp")
            temp_path.write_bytes(image_resp.content)
            temp_path.replace(local_path)
            image_relative_path = (ASSETS_MODELS_RELATIVE / file_name).as_posix()
          except Exception as err:
            log(f"[!] Failed to download image for model {model.get('name')} ({model_id}): {err}")

        image_for_doc = image_relative_path or old_image_path

        if old_image_path and image_relative_path and old_image_path != image_relative_path:
          try:
            old_path = Path(old_image_path)
            if not old_path.is_absolute():
              old_path = resolve_public_asset_path(old_image_path)
            if old_path.exists():
              old_path.unlink()
              log(f"[i] Removed previous image for model id {model_id}")
          except Exception as delete_err:
            log(f"[!] Failed to remove old image for model id {model_id}: {delete_err}")

        fuel_names = [entry.get("name") for entry in model.get("fuel", []) if entry.get("name")]

        if (not model_services) and existing_doc and existing_doc.get("services"):
          preserved_services = existing_doc.get("services")
          model_services = preserved_services if isinstance(preserved_services, list) else []
        else:
          model_services = model_services or []

        resolved_brand_name = brand_name or (existing_doc.get("brand_name") if existing_doc else None) or f"Brand {brand_id}"

        doc = {
          "id": model_id,
          "name": model.get("name"),
          "thumbnail": thumbnail_for_doc,
          "image": image_for_doc or "",
          "body_type": model.get("Segment"),
          "brand_id": brand_id,
          "brand_name": str(resolved_brand_name),
          "fuel_type": fuel_names,
          "slug": model.get("slug"),
          "services": model_services,
          "status": bool(True),
          "updated_date": now
        }

        log(f"Model doc: {doc}")

        update_payload = {"$set": doc, "$unset": {"api_id": ""}}

        if existing_doc is None:
          update_payload["$setOnInsert"] = {"created_date": now}
        elif not existing_doc.get("created_date"):
          update_payload["$set"]["created_date"] = now

        db.models.update_one({"id": model_id}, update_payload, upsert=True)

    with ThreadManager.ThreadPoolExecutor(max_workers=min(8, (os.cpu_count() or 4))) as executor:
      list(executor.map(process_brand_models, brand_records))

    print("[+] Models synced to MongoDB")

def main():
  csw_data = CSW()
  print("[+] Starting data fetching of Go Mechanic\n")

  print("[+] Starting brands of Go Mechanic\n")
  csw_data.fetch_brands(db)

  print("[+] Starting models of Go Mechanic\n")
  csw_data.fetch_models(db)

if __name__ == "__main__":
  try:
      main()

  except KeyboardInterrupt:
      print("[-] Keyboard Interrupt")

  except Exception as err:
      print(f"[-] Unhandled exception: {str(err)}")

