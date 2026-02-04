# ☁️ TurboVets Infrastructure (IaC)

This directory contains the Infrastructure as Code (IaC) using **CDK for Terraform (CDKTF)** in TypeScript.

## 🏗 Infrastructure Components
- **ECS Fargate**: Runs the application container.
- **VPC & Security Groups**: Handles networking and allows traffic on port 3000.
- **ECR**: Private registry for storing Docker images.

## 🚀 Deployment Instructions
1. **Initialize**: `cdktf get`
2. **Plan**: `cdktf plan`
3. **Deploy**: `cdktf deploy`

## ⚙️ Configuration Templates
Review the `main.ts` for environment-specific configurations including CPU/Memory allocations for the Fargate tasks.