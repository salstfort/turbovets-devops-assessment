import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { AwsProvider } from "./.gen/providers/aws/provider";
import { Vpc } from "./.gen/providers/aws/vpc";
import { Subnet } from "./.gen/providers/aws/subnet";
import { InternetGateway } from "./.gen/providers/aws/internet-gateway";
import { RouteTable } from "./.gen/providers/aws/route-table";
import { Route } from "./.gen/providers/aws/route";
import { RouteTableAssociation } from "./.gen/providers/aws/route-table-association";
import { EcsCluster } from "./.gen/providers/aws/ecs-cluster";
import { SecurityGroup } from "./.gen/providers/aws/security-group";
import { EcsTaskDefinition } from "./.gen/providers/aws/ecs-task-definition";
import { EcsService } from "./.gen/providers/aws/ecs-service";
import { EcrRepository } from "./.gen/providers/aws/ecr-repository";
import { IamRole } from "./.gen/providers/aws/iam-role";
import { IamRolePolicyAttachment } from "./.gen/providers/aws/iam-role-policy-attachment";
import { CloudwatchLogGroup } from "./.gen/providers/aws/cloudwatch-log-group";

/**
 * ExpressStack defines the complete AWS Infrastructure as Code.
 * It provisions a secure network, a private container registry, 
 * and an ECS Fargate service to run the TurboVets application.
 */
class ExpressStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // 1. Provider Setup: Targeting US-East-1 for high availability and standard compliance
    new AwsProvider(this, "AWS", {
      region: "us-east-1",
    });

    // 2. Networking Foundation: Provisioning a custom Virtual Private Cloud (VPC)
    // Using a /16 CIDR block provides ample IP space for future scaling
    const vpc = new Vpc(this, "TurboVetsVpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsSupport: true,
      enableDnsHostnames: true,
      tags: { Name: "turbovets-vpc" }
    });

    // Public Subnet: Where the Fargate task will reside to be reachable via Public IP
    // cidrBlock 10.0.1.0/24 allows for 254 usable IP addresses
    const publicSubnet = new Subnet(this, "PublicSubnet", {
      vpcId: vpc.id,
      cidrBlock: "10.0.1.0/24",
      mapPublicIpOnLaunch: true, // Required for Fargate tasks to reach ECR and for user access
      tags: { Name: "turbovets-public-subnet" }
    });

    // Internet Gateway (IGW): Allows communication between the VPC and the internet
    const igw = new InternetGateway(this, "Gateway", {
      vpcId: vpc.id,
      tags: { Name: "turbovets-igw" }
    });

    // Route Table & Association: Directs outbound traffic (0.0.0.0/0) through the IGW
    const routeTable = new RouteTable(this, "PublicRouteTable", {
      vpcId: vpc.id,
      tags: { Name: "turbovets-public-rt" }
    });

    new Route(this, "PublicRoute", {
      routeTableId: routeTable.id,
      destinationCidrBlock: "0.0.0.0/0",
      gatewayId: igw.id,
    });

    new RouteTableAssociation(this, "PublicSubnetAssoc", {
      subnetId: publicSubnet.id,
      routeTableId: routeTable.id,
    });

    // 3. ECR Repository: Private Docker registry to store the TurboVets image
    const repository = new EcrRepository(this, "AppRepo", {
      name: "turbovets-app-repo",
      forceDelete: true, // Enables clean teardown during assessment cycles
    });

    // 4. ECS Cluster: Logical isolation for our containerized services
    const cluster = new EcsCluster(this, "Cluster", {
      name: "turbovets-express-cluster",
    });

    // 5. Security Group (Firewall): Restricts traffic to minimize attack surface
    const sg = new SecurityGroup(this, "AppSg", {
      name: "express-app-sg",
      vpcId: vpc.id,
      // Inbound: Only allow TCP traffic on Port 3000 to reach our Node.js app
      ingress: [
        {
          fromPort: 3000,
          toPort: 3000,
          protocol: "tcp",
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
      // Outbound: Default allow to permit container updates and log shipping
      egress: [
        { fromPort: 0, toPort: 0, protocol: "-1", cidrBlocks: ["0.0.0.0/0"] },
      ],
    });

    // 6. IAM Execution Role: Grants ECS permission to interact with AWS services
    const executionRole = new IamRole(this, "EcsExecutionRole", {
      name: "turbovets-ecs-exec-role",
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Principal: { Service: "ecs-tasks.amazonaws.com" },
            Effect: "Allow",
          },
        ],
      }),
    });

    // Attaching TaskExecution policy so the Fargate agent can pull images from ECR
    new IamRolePolicyAttachment(this, "EcsExecPolicy", {
      role: executionRole.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    });

    // CloudWatch Log Group: Centralizes stdout/stderr from the container for debugging
    const logGroup = new CloudwatchLogGroup(this, "LogGroup", {
      name: "/ecs/turbovets-app",
      retentionInDays: 7, // Cost-efficient log retention
    });

    // 7. ECS Task Definition: The blueprint for the container runtime
    const taskDef = new EcsTaskDefinition(this, "AppTask", {
      family: "express-app",
      cpu: "256", // 0.25 vCPU: Balanced for a simple Node.js microservice
      memory: "512", // 0.5 GB: Sufficient for memory-efficient slim images
      networkMode: "awsvpc", // Required for Fargate integration
      requiresCompatibilities: ["FARGATE"],
      executionRoleArn: executionRole.arn,
      containerDefinitions: JSON.stringify([
        {
          name: "express-container",
          image: `${repository.repositoryUrl}:latest`, 
          portMappings: [{ containerPort: 3000, hostPort: 3000 }],
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-group": logGroup.name,
              "awslogs-region": "us-east-1",
              "awslogs-stream-prefix": "ecs",
            },
          },
        },
      ]),
    });

    // 8. ECS Service: Manages the lifecycle and availability of our task
    new EcsService(this, "AppService", {
      name: "express-service",
      cluster: cluster.arn,
      taskDefinition: taskDef.arn,
      desiredCount: 1, // Single instance for development/assessment purposes
      launchType: "FARGATE",
      networkConfiguration: {
        subnets: [publicSubnet.id],
        securityGroups: [sg.id],
        assignPublicIp: true, // Enables direct browser access to the container
      },
    });
  }
}

// Entry point for the CDKTF application
const app = new App();
new ExpressStack(app, "iac-dev");
app.synth();