FROM node:22-alpine AS generator
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY scripts/server ./scripts/server
RUN node scripts/server/build.mjs

FROM node:22-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/*.js ./
COPY --from=generator /build/server/generated ./generated
EXPOSE 8787
CMD ["node", "server.js"]
