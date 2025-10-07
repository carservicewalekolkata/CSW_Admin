# CSW Admin

Next.js admin panel for Car Service Wale with dedicated Python data-management scripts. The repository is now split into a frontend application bundle and a reusable script toolkit that ships inside the production container image.

```
.
├── admin-app          # Next.js 15 application and API routes
├── scripts            # Python utilities (MongoDB seeding, integrations, etc.)
├── Dockerfile         # Ubuntu 22.04 runtime used for GHCR / Azure Container Apps
└── docker-compose.yml # Local orchestration and script runner profile
```

## Environment Variables

All runtime configuration is sourced from the operating system (or container) environment. The most important keys are:

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | Connection string with write access to the CSW database. |
| `DB_CSW_NAME` | ⛔ | Optional override when the database name is not embedded in the URI. |
| `GOMECHANIC_BEARER_TOKEN` | ⛔ | Enables the GoMechanic catalogue sync. |
| `SUPER_USER_MAIL` | ✅ | Login for the seeded super admin account. |
| `SUPER_USER_PASSWORD` | ✅ | Initial/reset password for the seeded super admin. |

For local development you may still create `admin-app/.env.local` (Next.js automatically loads it) and/or `scripts/.env.local`; the Python helpers will also look in the repository root and `admin-app` for convenience. In containerised environments supply the values through Docker `--build-arg`, compose environment variables, or Azure Container App settings.

## Local Development

### Next.js frontend

```bash
cd admin-app
npm install
npm run dev          # http://localhost:3000
npm run lint
```

### Python tooling

Python 3.11+ is recommended. Install the dependencies once:

```bash
python -m pip install --upgrade pip
python -m pip install -r scripts/requirements.txt
```

### Seeding utilities

All commands are executed from inside `admin-app` and use the Python scripts located in `/scripts`:

- `npm run seed:superuser` – creates or updates the super admin record.
- `npm run seed:gomechanic` – idempotent GoMechanic catalogue import (can take several minutes).
- `npm run seed` – runs both scripts sequentially.

The Python scripts now rely on OS environment variables. If values are missing the command exits with a friendly error so you can inject them via `export`, PowerShell `$env:`, or Docker.

## Docker Tooling

The `Dockerfile` builds on Ubuntu 22.04 LTS, compiles the Next.js application, installs Python dependencies into `/opt/venv`, and exposes both the app and scripts in the same container image. Compose now reuses a shared BuildKit cache stored under `.docker/cache` so repeat builds reuse layers instead of recompiling every time.

```bash
# Build (multi-arch buildx recommended for GHCR/Azure deployments)
docker buildx build \
  --platform linux/amd64 \
  --target runner \
  --build-arg MONGODB_URI=$MONGODB_URI \
  --build-arg SUPER_USER_MAIL=$SUPER_USER_MAIL \
  --build-arg SUPER_USER_PASSWORD=$SUPER_USER_PASSWORD \
  -t ghcr.io/carservicewalekolkata/csw-admin:latest .

# Run locally
docker run --rm -p 3000:3000 ghcr.io/carservicewalekolkata/csw-admin:latest
```

Use `docker compose` for a smoother local workflow and to access the bundled Python scripts:

```bash
# Start the admin app (expects host env vars or a local .env file)
docker compose up --build admin-app

# Execute the super-user seeding script in the container context
docker compose run --rm scripts python /app/scripts/seed_super_user.py

# Execute the GoMechanic catalogue import
docker compose run --rm scripts python /app/scripts/seed_gomechanic_data.py
```

> Tip: place a `.env` file next to `docker-compose.yml` with the required keys so compose injects them automatically.

## Publishing to GitHub Container Registry (GHCR)

```bash
echo $GHCR_TOKEN | docker login ghcr.io -u YOUR_GITHUB_HANDLE --password-stdin
docker buildx build --platform linux/amd64 \
  --target runner \
  -t ghcr.io/carservicewalekolkata/csw-admin:latest \
  --push .
```

Tag additional versions (`:prod`, `:staging`, etc.) as needed. GitHub Actions can automate this process by reusing the same Dockerfile and `buildx` command.

## Deploying to Azure Container Apps

1. Push the image to GHCR as outlined above.
2. Create or update your container app:
   ```bash
   az containerapp create \
     --name csw-admin \
     --resource-group <rg> \
     --environment <env-name> \
     --image ghcr.io/carservicewalekolkata/csw-admin:latest \
     --target-port 3000 \
     --ingress external \
     --registry-server ghcr.io \
     --registry-username YOUR_GITHUB_HANDLE \
     --registry-password $GHCR_TOKEN \
     --env-vars MONGODB_URI=$MONGODB_URI SUPER_USER_MAIL=$SUPER_USER_MAIL SUPER_USER_PASSWORD=$SUPER_USER_PASSWORD DB_CSW_NAME=$DB_CSW_NAME
   ```
3. Repeat with `az containerapp update` to roll out new tags.

Remember to schedule or manually trigger the Python scripts (for example with an Azure Container App job or GitHub Actions workflow) whenever catalogue updates or credential refreshes are required.

## Continuous Delivery

Pushing to `development` or `main` kicks off the **Build and Publish Container** workflow located at `.github/workflows/container.yml`. The job uses Docker Buildx with the GitHub Actions cache to build the `runner` stage and push the resulting image to `ghcr.io/carservicewalekolkata/csw-admin`, tagging it with the branch name and commit SHA automatically. Provide any required secrets (for example `MONGODB_URI`) as repository or environment secrets if you extend the workflow to run database migrations or other scripts.

## Additional Notes

- MongoDB credentials must allow read/write access to the configured database.
- The GoMechanic import can be slow on first run – re-running is safe; existing documents are upserted.
- Secrets should be injected at deploy time rather than baked into the image. The Dockerfile accepts `--build-arg` values, but production deployments should prefer runtime environment settings from GHCR/Azure.
