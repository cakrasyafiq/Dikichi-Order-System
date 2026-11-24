FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
# WHY: the lockfile only exists after the first local install is committed, so the very first build falls back to install.
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
COPY . .
# WHY: type safety is enforced by the verify script and CI, so the image build only bundles and never fails on type errors.
RUN npx vite build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/proxy-gateway.conf /etc/nginx/snippets/proxy-gateway.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
