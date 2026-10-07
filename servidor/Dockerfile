# Compra de Peça — servidor próprio. Imagem para o Cloud Run.
FROM node:22-slim AS base
WORKDIR /app
# leitura de documentos (fase 2): pdftotext/pdftoppm + Tesseract em português; fuso de São Paulo (os leitores do robô
# montam datas no horário local)
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils tesseract-ocr tesseract-ocr-por tzdata \
  && rm -rf /var/lib/apt/lists/*
ENV TZ=America/Sao_Paulo

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
COPY recursos ./recursos
EXPOSE 8080
CMD ["node", "dist/index.js"]
