FROM node:22-alpine
WORKDIR /app

# Install pnpm and dependencies first
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install

# Copy source files
COPY . .

# Ensure node_modules is not overwritten by volume mounts
# by creating a .dockerignore-style marker
RUN touch .docker-installed

EXPOSE 3000
CMD ["pnpm", "start"]
