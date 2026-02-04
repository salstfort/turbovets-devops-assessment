# 🚀 TurboVets Application

This directory contains the Node.js TypeScript application code and deployment configuration.

## 🛠 Local Setup
1. **Install Dependencies**: `npm install`
2. **Run Locally (Dev)**: `npm run dev` or `ts-node src/server.ts`
3. **Build Container**: `docker build -t turbovets-app .`

## 🏗 CI/CD Pipeline
- **Workflows**: Located in `.github/workflows/`
- **Automation**: On every push to `main`, the GitHub Action builds the Docker image and pushes it to AWS ECR.
- **Port**: The application listens on port **3000** and binds to `0.0.0.0` for container compatibility.