# Hamilton.az — Coolify/Docker üçün istehsal imici
# 1) build: Vite ilə statik sayt (dist/)
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# 2) runtime: yalnız dist/ + server/ + istehsal asılılıqları (nodemailer)
FROM node:24-alpine
WORKDIR /app
# HOST=:: — həm IPv6, həm IPv4 (Coolify healthcheck "localhost"-u ::1 kimi yoxlayır)
ENV NODE_ENV=production HOST=:: PORT=3000 TRUST_PROXY=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server ./server
COPY src/data ./src/data
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server/index.js"]
