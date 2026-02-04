# Use a lightweight Node.js 18 image to minimize the attack surface and image size
FROM node:18-slim

# Set the working directory inside the container for organized file management
WORKDIR /usr/src/app

# Copy only the package files first to leverage Docker's layer caching for faster builds
COPY package*.json ./

# Install project dependencies and global TypeScript utilities
# Globally installing ts-node and typescript allows us to run .ts files directly in development
RUN npm install && npm install -g ts-node typescript

# Copy the remaining source code into the container
COPY . .

# Inform Docker that the container listens on Port 3000 at runtime
# This matches the Security Group and Task Definition configurations in our IaC
EXPOSE 3000

# Use ts-node to execute the entry point directly
# This skips the manual 'tsc' compilation step, streamlining the deployment for this assessment
CMD [ "ts-node", "src/server.ts" ]