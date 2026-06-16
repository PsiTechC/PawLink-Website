FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# App source
COPY . .

EXPOSE 3000
USER node

CMD ["node", "server.js"]
