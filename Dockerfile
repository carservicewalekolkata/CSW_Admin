# syntax=docker/dockerfile:1.7

ARG UBUNTU_VERSION=22.04

###########################################################################
# Base image with Node.js 20.x, Python 3.10, and build tooling.
###########################################################################
FROM ubuntu:${UBUNTU_VERSION} AS base
ENV DEBIAN_FRONTEND=noninteractive \
    NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       curl \
       gnupg \
       python3 \
       python3-pip \
       python3-venv \
       build-essential \
       libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g npm@10 \
    && corepack enable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

###########################################################################
# Install Node.js dependencies for the Next.js admin app.
###########################################################################
FROM base AS deps
WORKDIR /workspace/admin-app
COPY admin-app/package.json admin-app/package-lock.json ./
RUN npm ci

###########################################################################
# Build Next.js application.
###########################################################################
FROM deps AS builder
WORKDIR /workspace/admin-app
COPY admin-app ./
RUN npm run build
# Strip dev dependencies before packaging runtime image.
RUN npm prune --omit=dev

###########################################################################
# Python virtualenv with script dependencies.
###########################################################################
FROM base AS python-deps
WORKDIR /workspace
COPY scripts/requirements.txt scripts/requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install -r scripts/requirements.txt

###########################################################################
# Final runtime image for Azure Container Apps / GHCR.
###########################################################################
FROM base AS runner
WORKDIR /app

# Copy production ready Next.js build artefacts.
COPY --from=builder /workspace/admin-app /app/admin-app

# Copy Python scripts and dependencies.
COPY --from=python-deps /opt/venv /opt/venv
COPY scripts /app/scripts

# Create non-root user for runtime safety.
RUN useradd --create-home --system --shell /usr/sbin/nologin appuser \
    && chown -R appuser:appuser /app \
    && chown -R appuser:appuser /opt/venv

# Environment variable plumbing for containerised deployments.
ARG MONGODB_URI=""
ARG DB_CSW_NAME=""
ARG GOMECHANIC_BEARER_TOKEN=""
ARG SUPER_USER_MAIL=""
ARG SUPER_USER_PASSWORD=""
ENV MONGODB_URI=${MONGODB_URI} \
    DB_CSW_NAME=${DB_CSW_NAME} \
    GOMECHANIC_BEARER_TOKEN=${GOMECHANIC_BEARER_TOKEN} \
    SUPER_USER_MAIL=${SUPER_USER_MAIL} \
    SUPER_USER_PASSWORD=${SUPER_USER_PASSWORD} \
    NODE_ENV=production \
    PATH="/opt/venv/bin:${PATH}" \
    PORT=3000

EXPOSE 3000

WORKDIR /app/admin-app
USER appuser

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
