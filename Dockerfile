# syntax=docker/dockerfile:1.28.0@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b
#
# Multi-stage build on Docker Hardened Images (pulling from dhi.io needs `docker login dhi.io`
# with a Docker Hub account):
#   build    Node dev image: installs the dependencies and builds the UI (static files)
#   runtime  hardened nginx (non-root uid 65532): serves the UI and proxies the core
#
# The build stage runs on the builder's native platform (--platform=$BUILDPLATFORM): its output
# is architecture independent, so the arm64 and amd64 images are produced without emulation.
# Typecheck, lint and tests run in CI, not here.
#
#   docker build -t ferrocine-ui .
#   docker run --rm -p 8080:8080 -e FERROCINE_UPSTREAM=http://core:8096 --read-only --tmpfs /tmp ferrocine-ui
#
# Images are pinned by digest (multi-arch index); Renovate keeps them up to date.

FROM --platform=$BUILDPLATFORM dhi.io/node:26-alpine-dev@sha256:393f63498dc3739e4a1cc9e618261927d74663ab023b96b38d29c57199702dc6 AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build

FROM dhi.io/nginx:1-alpine3.24@sha256:6d3811fbc76c5d0652752b39a003769759ccfeb2c1e874bacf99e3d44e5da3b9 AS runtime
ARG REVISION=unknown
# The release tag (e.g. 2026-10-23), or edge-<commit>.
ARG VERSION=dev
LABEL org.opencontainers.image.title="ferrocine-ui" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.description="Web UI of Ferrocine, a self-hosted media server" \
      org.opencontainers.image.source="https://github.com/sebastka/ferrocine-ui" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.revision="${REVISION}"

# Owned by root and world-readable: the nginx user (65532) cannot modify them, and a read-only
# root filesystem works (nginx writes only to /tmp/nginx).
# (No --chmod on the directory copy: it would apply to the directory too, leaving it untraversable.)
COPY deploy/nginx/ /etc/ferrocine-ui/
COPY --from=build /src/dist /usr/share/ferrocine-ui

ENV FERROCINE_UPSTREAM=http://ferrocine:8096
USER 65532:65532
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/ui-healthz"]

ENTRYPOINT ["/etc/ferrocine-ui/docker-entrypoint.sh"]
CMD []
