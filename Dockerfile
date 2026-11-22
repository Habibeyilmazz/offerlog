# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN NEXT_OUTPUT=standalone npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=4220 \
    OFFERLOG_DB=/data/offerlog.db
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/drizzle ./drizzle
# The SQLite driver loads a prebuilt native binary that output tracing can miss.
COPY --from=build /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 4220
CMD ["node", "server.js"]
