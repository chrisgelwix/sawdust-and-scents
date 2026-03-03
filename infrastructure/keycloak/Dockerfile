# Start from the official Keycloak image
# Using a pinned version (e.g. 24.0) is recommended in production so a Keycloak
# upgrade never happens silently. Use `latest` here while developing.
FROM quay.io/keycloak/keycloak:latest

# Copy the exported realm JSON into the Keycloak import directory
# Keycloak 20+ requires the --import-realm flag at startup to read from this directory
# The realm is only imported when the database is empty (i.e. first boot on a fresh RDS instance)
# Keycloak 20+ requires the filename to follow the pattern: {realm-name}-realm.json
# The realm name inside the JSON is "sdas-realm", so the file must be named sdas-realm-realm.json
# We keep the source file named sdas-realm.json in the repo for readability and rename on COPY
COPY sdas-realm.json /opt/keycloak/data/import/sdas-realm-realm.json

# Set the default startup command for this image
# start-dev is for smoke-testing only; ECS overrides this with `start` (production mode)
# --import-realm tells Keycloak to read all JSON files from /opt/keycloak/data/import/
CMD ["start-dev", "--import-realm"]