FROM node:20-alpine

WORKDIR /app

# `postinstall` runs `prisma generate`, which needs the schema on disk before `npm install`.
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

COPY . .

COPY docker/next/entrypoint-dev.sh /entrypoint-dev.sh
RUN chmod +x /entrypoint-dev.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint-dev.sh"]
# Port only; `npm run dev` already binds 0.0.0.0 (see package.json).
CMD ["npm", "run", "dev", "--", "-p", "3000"]
