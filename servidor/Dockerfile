# Compra de Peça — servidor próprio. Imagem para o Cloud Run.
FROM node:22-slim AS base
WORKDIR /app
# poppler-utils (pdftotext) e tesseract entram na fase 2 (leitura de documentos):
# RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-por && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM base AS final
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
EXPOSE 8080
CMD ["node", "dist/index.js"]
