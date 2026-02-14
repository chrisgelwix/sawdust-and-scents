# Step 34: AWS Cloud Infrastructure and Deployment

Transitioning from a local `docker-compose` environment to a production-grade cloud infrastructure is a major milestone. We will use **Amazon Web Services (AWS)** as our primary target, focusing on scalability, security, and automation using **Infrastructure as Code (IaC)**.

## 1. Core Concepts & Definitions

### Infrastructure as Code (IaC)
IaC is the practice of managing and provisioning computing infrastructure through machine-readable definition files, rather than physical hardware configuration or interactive configuration tools.
*   **Tools**: **Terraform** (Industry standard) or **AWS CDK** (TypeScript-based).

### Container Orchestration (ECS/EKS)
In production, you don't just run one container; you run dozens. Orchestration tools handle scaling, health checks, and load balancing.
*   **AWS ECS (Elastic Container Service)**: Simpler, highly integrated with AWS.
*   **AWS EKS (Elastic Kubernetes Service)**: More powerful, industry standard for complex apps.

### Managed Databases (RDS & DocumentDB)
Instead of managing your own database server, AWS provides "Managed" versions that handle backups, patching, and high availability automatically.
*   **PostgreSQL**: AWS RDS (Relational Database Service).
*   **MongoDB**: AWS DocumentDB (MongoDB-compatible).

---

## 2. The AWS Architecture

Our application will be deployed following the **AWS Well-Architected Framework**:

1.  **Frontend**: Hosted as static files in **S3** and distributed globally via **CloudFront** (CDN).
2.  **API**: Dockerized NestJS app running on **AWS ECS Fargate** (Serverless containers).
3.  **Data**: **AWS RDS** for Postgres and **AWS DocumentDB** for MongoDB.
4.  **Security**: **AWS Secrets Manager** for `.env` variables and **AWS IAM** for permissions.
5.  **Traffic**: **Application Load Balancer (ALB)** to distribute traffic to our containers.

---

## 3. Implementation Steps (Terraform Overview)

### Step 3.1: Define the VPC (Virtual Private Cloud)
We create a private network to isolate our databases from the public internet.

```hcl
# main.tf (Example snippet)
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  name   = "sdas-vpc"
  cidr   = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
}
```

### Step 3.2: Provision Managed Databases
We create the RDS and DocumentDB instances within our private subnets.

### Step 3.3: Deploy Containers with ECS
1.  **ECR (Elastic Container Registry)**: Push your Docker images here.
2.  **Task Definition**: Define how much CPU/RAM your API needs.
3.  **Service**: Tell ECS to keep 2 copies of your app running at all times.

---

## 4. Deployment Pipeline (GitHub Actions)

Your CI/CD pipeline is updated to deploy automatically when code is merged to the `main` branch.

```yaml
  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push image to Amazon ECR
        run: |
          docker build -t sdas-api .
          docker tag sdas-api:latest ${{ steps.login-ecr.outputs.registry }}/sdas-api:latest
          docker push ${{ steps.login-ecr.outputs.registry }}/sdas-api:latest

      - name: Deploy to Amazon ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition.json
          service: sdas-api-service
          cluster: sdas-cluster
```

---

## 5. Vocabulary Breakdown

*   **Fargate**: A serverless compute engine for containers. You don't have to manage servers; you just pay for the CPU and RAM your containers use.
*   **CDN (Content Delivery Network)**: A system of distributed servers that deliver web content to users based on their geographic location (CloudFront).
*   **Availability Zone (AZ)**: One or more discrete data centers with redundant power, networking, and connectivity in an AWS Region.
*   **Terraform**: An open-source tool that allows you to define your infrastructure using a declarative configuration language (HCL).



