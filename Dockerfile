# TourFlow production image
# Build:  docker build -t tourflow .
# Run:    docker run -p 127.0.0.1:3000:3000 -v /srv/tourflow:/data --env-file /srv/tourflow.env tourflow
# Keep the settings file OUTSIDE this project folder so secrets never end up inside the image.
# The app runs as user id 10001: on a VPS run  sudo mkdir -p /srv/tourflow && sudo chown 10001:10001 /srv/tourflow

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 BUILD_STANDALONE=true
RUN rm -rf data && npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 DATA_DIR=/data
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app --home /app app \
  && mkdir -p /data && chown app:app /data
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/scripts ./scripts
COPY --from=build --chown=app:app /app/lib/password.js ./lib/password.js
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
