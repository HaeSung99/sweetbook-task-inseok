FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/main.js"]
