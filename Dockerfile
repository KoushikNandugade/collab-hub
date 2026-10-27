FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --no-audit --no-fund
COPY client ./client
RUN npm run build
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/client/dist ./client/dist
COPY --chown=node:node server ./server
COPY --chown=node:node package.json ./package.json
USER node
EXPOSE 3001
CMD ["node", "server/src/index.js"]
