# smart-home-automation-api/Dockerfile
# Use a slim Node.js image for production for smaller image size
# Senior insight: Use a specific version, not latest, for consistency and reproducibility.
FROM node:20-alpine AS base

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker's build cache.
# This step is often cached, so subsequent builds are faster if dependencies don't change.
COPY package*.json ./

# Install dependencies. Use `npm ci` for clean installs in CI/CD environments,
# as it uses package-lock.json to ensure exact dependency versions.
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Expose the port your application runs on
EXPOSE 3000

# Command to run the application
# Use `npm start` which runs `node dist/server.js`
CMD ["npm", "start"]

# --- Development Stage (Optional but good practice) ---
# This stage can be used for building a development image with dev dependencies and nodemon
FROM base AS development
WORKDIR /app
COPY package*.json ./
RUN npm install # Install all dependencies for dev
COPY . .
# Command to run the application in development mode with nodemon
CMD ["npm", "run", "dev"]