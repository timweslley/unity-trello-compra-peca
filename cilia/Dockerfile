# Módulo Cilia (Cloud Run Job "cilia-sync"): roda uma vez por dia e termina.
FROM mirror.gcr.io/library/node:22-slim
WORKDIR /app
ENV NODE_ENV=production TZ=America/Sao_Paulo
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
CMD ["node", "src/sincronizar.mjs"]
