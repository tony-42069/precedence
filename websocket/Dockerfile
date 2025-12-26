FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY websocket_service.js .

EXPOSE 5003

CMD ["node", "websocket_service.js"]
