# Stage 1: The Build Stage
FROM node:18-slim AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies, including dev dependencies, using npm ci for reproducibility
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Stage 2: The Production Image
# Use a lightweight base image for the final production container
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy only the package.json and production dependencies from the build stage
COPY --from=builder /app/package.json ./
RUN npm install --omit=dev

# Copy the compiled application from the build stage
COPY --from=builder /app/dist ./dist

# Copy other essential files

COPY --from=builder /app/package.json ./

# Expose the application port
EXPOSE 3000

# Set the environment to production
ENV NODE_ENV=production

# The command to run the application
CMD [ "npm", "run", "start:prod" ]