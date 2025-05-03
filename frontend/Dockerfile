# Use Node.js image to build the frontend
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
COPY bun.lockb ./
COPY . .
RUN npm ci
RUN npm run build

# Use Nginx to serve the static files
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 