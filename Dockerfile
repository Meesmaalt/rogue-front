# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# --- arendus: Vite dev server (HMR) ---
FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# --- build ---
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# --- tootmine: staatilised failid nginxist ---
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
