FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 3002

# Start app
CMD ["node", "src/server.js"]
