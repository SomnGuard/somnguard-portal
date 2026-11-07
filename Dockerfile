FROM node:22.22.0-alpine3.22 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_STREAM_WS_URL=
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_STREAM_WS_URL=${VITE_STREAM_WS_URL}

RUN test -n "$VITE_API_URL" \
    && npm run build

FROM nginx:1.30.6-alpine3.24 AS runtime

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
