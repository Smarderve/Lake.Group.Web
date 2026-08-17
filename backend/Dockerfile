FROM node:24.19.0-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts \
    && npm run db:generate \
    && npm prune --omit=dev \
    && npm cache clean --force

FROM node:24.19.0-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=dependencies --chown=node:node /app/generated ./generated
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src

USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
