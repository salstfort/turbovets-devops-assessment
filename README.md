# 🚀 TurboVets DevOps Assessment

This repository contains a production-ready, containerized Express.js application and the Infrastructure as Code (IaC) required to deploy it to AWS. The project demonstrates full-stack automation using TypeScript, Docker, and CDKTF.

## 📁 Project Structure

* **`/app`**: Node.js Express application written in TypeScript, featuring a Dockerized environment and automated lifecycle management.
* **`/iac`**: CDKTF configuration for provisioning a high-availability AWS infrastructure (VPC, ECS Fargate, ECR).

---

## 🛠️ Local Development & Testing

To verify the application locally before cloud deployment, use Docker Compose. This ensures environment parity between your local machine and the AWS Cloud.

### Prerequisites
* Docker and Docker Compose installed.

### Steps to Run Locally
1. **Navigate to the app directory** (where docker-compose.yml is located).
2. **Start the container**:
    ```bash
    docker-compose up --build
    ```
3. **Access the app**: 
    Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the message: **"TurboVets App is Live! Deployment Successful."**.

> **Technical Note**: The application is configured to use **CommonJS** modules. This choice ensures stable execution with `ts-node` inside the Docker container, avoiding the experimental complexities of ES Modules (ESM) in a headless Linux environment.

---

## ⚙️ Technical Decisions & Enhancements

To ensure the application runs reliably in a production cloud environment, the following enhancements were made to the provided codebase:

### 1. Cloud-Ready `server.ts`
The `server.ts` entry point was updated to handle the unique constraints of a containerized environment:
* **Network Interface Binding (`0.0.0.0`):** Modified the listener to bind to `0.0.0.0`. In AWS Fargate, binding to `localhost` (127.0.0.1) restricts traffic to the container's internal loopback, which would cause ECS health check failures.
* **Graceful Shutdown Logic:** Implemented listeners for `SIGTERM` and `SIGINT` signals. This allows the server to finish processing "in-flight" requests before exiting during an AWS scaling event or deployment, preventing 502/504 gateway errors.



### 2. Infrastructure as Code (CDKTF)
The infrastructure is fully automated using **CDKTF**, ensuring a repeatable and version-controlled environment.
* **Least Privilege:** The ECS Execution Role is strictly scoped to allow ECR image pulling and CloudWatch log streaming.
* **Security:** Security Groups are configured to allow inbound traffic strictly on **Port 3000**.

---

## ☁️ Infrastructure & Deployment

The infrastructure is provisioned on AWS using **ECS Fargate**, providing a serverless experience that eliminates the need to manage EC2 instances.



### Resources Provisioned:
* **Networking**: Custom VPC (10.0.0.0/16) with a public subnet and an Internet Gateway.
* **Compute**: ECS Cluster and Fargate Service managing the task lifecycle.
* **Storage**: Amazon ECR Repository for secure Docker image management.
* **Observability**: CloudWatch Log Group (`/ecs/turbovets-app`) for centralized application logs.

### Deployment Workflow:

1. **Build and Push to ECR**:
    ```bash
    # 1. Authenticate Docker to AWS
    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

    # 2. Build the image
    docker build -t turbovets-app ./app

    # 3. Tag and Push
    docker tag turbovets-app:latest <AWS_ACCOUNT_ID>[.dkr.ecr.us-east-1.amazonaws.com/turbovets-app-repo:latest](https://.dkr.ecr.us-east-1.amazonaws.com/turbovets-app-repo:latest)
    docker push <AWS_ACCOUNT_ID>[.dkr.ecr.us-east-1.amazonaws.com/turbovets-app-repo:latest](https://.dkr.ecr.us-east-1.amazonaws.com/turbovets-app-repo:latest)
    ```

2. **Provision Infrastructure**:
    ```bash
    cd iac
    npm install
    cdktf deploy --auto-approve
    ```

---

## 🛑 Teardown
To avoid unnecessary AWS costs after the assessment review, run the following command to destroy all provisioned resources:
```bash
cd iac
cdktf destroy --auto-approve