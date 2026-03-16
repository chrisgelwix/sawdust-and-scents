# ── Stage 1: build ────────────────────────────────────────────────────────────
# Run `kc.sh build` at image-build time so Quarkus augmentation never happens at
# container start. Without this, every cold-start takes 60-90 seconds just for
# augmentation, which routinely exceeds ALB health-check grace periods.
FROM quay.io/keycloak/keycloak:latest AS builder

# These env vars must be known at BUILD time so kc.sh build can bake them in.
# Runtime-only vars (KC_HOSTNAME, KC_DB_URL, credentials) are still set via ECS.
ENV KC_DB=postgres
ENV KC_PROXY_HEADERS=xforwarded
ENV KC_HTTP_ENABLED=true

RUN /opt/keycloak/bin/kc.sh build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM quay.io/keycloak/keycloak:latest

# Copy the pre-built server from the builder stage
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Copy the realm JSON for first-boot import
# File must be named {realm-name}-realm.json for Keycloak to auto-import it
COPY sdas-realm.json /opt/keycloak/data/import/sdas-realm-realm.json

# start --optimized skips the build step at runtime (uses the pre-built image above)
# --import-realm imports the realm JSON on first boot when the DB is empty
CMD ["start", "--optimized", "--import-realm"]