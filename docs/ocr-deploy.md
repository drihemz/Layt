# SOF OCR Deploy Steps (AWS ECR/ECS or EC2)

Updated image is already pushed to ECR: `516466084656.dkr.ecr.eu-north-1.amazonaws.com/zouheir/sof-ocr:latest`.

## Build & Push (from local/mac)
```bash
# Authenticate to ECR
aws ecr get-login-password --region eu-north-1 \
  | docker login --username AWS --password-stdin 516466084656.dkr.ecr.eu-north-1.amazonaws.com

# Build from the SOF-EXTRACT folder that contains the Dockerfile
docker build -t sof-ocr:latest \
  -f "/Users/zoudrh/Desktop/Maritime Voyage/SOF-EXTRACT/Dockerfile" \
  "/Users/zoudrh/Desktop/Maritime Voyage/SOF-EXTRACT"

# Tag and push to ECR
docker tag sof-ocr:latest 516466084656.dkr.ecr.eu-north-1.amazonaws.com/zouheir/sof-ocr:latest
docker push 516466084656.dkr.ecr.eu-north-1.amazonaws.com/zouheir/sof-ocr:latest
```

## Redeploy on EC2 (if running directly on a host)
```bash
ssh <ec2-host>
aws ecr get-login-password --region eu-north-1 \
  | docker login --username AWS --password-stdin 516466084656.dkr.ecr.eu-north-1.amazonaws.com

docker pull 516466084656.dkr.ecr.eu-north-1.amazonaws.com/zouheir/sof-ocr:latest
docker stop sof-ocr || true
docker rm sof-ocr || true

# Point --env-file to your existing OCR env file with SOF_* tunables
docker run -d --name sof-ocr -p 8000:8000 --restart unless-stopped \
  --env-file /path/to/ocr.env \
  516466084656.dkr.ecr.eu-north-1.amazonaws.com/zouheir/sof-ocr:latest
```

## Redeploy on ECS (managed)
Console steps (from the ECS service page):
1) Click the task definition link for the service (e.g., `ocr:3`).
2) Click **Create new revision** and set the container image to `516466084656.dkr.ecr.eu-north-1.amazonaws.com/zouheir/sof-ocr:latest`.
3) Keep port 8000 and all existing env vars (SOF_OCR_DPI, SOF_MAX_SECONDS, SOF_MAX_PDF_PAGES, SOF_PADDLE_THREADS, CORS origins).
4) Save the new revision (e.g., `ocr:4`).
5) Go back to the service, click **Update**, choose the new task definition revision, and deploy (rolling update).

## ALB / Target Group Health Checks (common 502 fix)
- Target group: set Health check path to `/health`, protocol HTTP, port = traffic port (8000).
- Ensure the task definition exposes container port 8000 and the service/target group points to that port.
- Security groups: ALB SG allows inbound 80 from clients; task ENI SG allows inbound 8000 from the ALB SG.
- After updating, wait for targets to show **healthy** (draining = old task shutting down). Only one task should remain and stay healthy.

## AWS CloudShell commands (no placeholders)
Force a new deployment on ECS to pick up the latest image/health endpoint:
```bash
aws ecs update-service \
  --cluster OCR \
  --service ocr-service-qu9kzscy \
  --force-new-deployment
```

Allow ALB SG to reach task SG on 8000 (replace sg-ALBID with your ALB SG ID):
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0923c68c0c42bb5fb \
  --protocol tcp --port 8000 --source-group sg-0923c68c0c42bb5fb
```

Remove inbound HTTP/80 on the task SG (not needed):
```bash
aws ec2 revoke-security-group-ingress \
  --group-id sg-0923c68c0c42bb5fb \
  --protocol tcp --port 80 --cidr 0.0.0.0/0
```

Tail ECS task logs (adjust log group if different):
```bash
aws logs tail /ecs/ocr --since 15m
```

# Notes
- Dockerfile now pre-downloads PaddleOCR models during build to avoid startup downloads (stabilizes health checks).
- Textract optional backend: set `USE_TEXTRACT=true` and `TEXTRACT_REGION=eu-north-1` (or your AWS region) on the OCR service to use Amazon Textract instead of PaddleOCR for PDFs.
- ALB and task security group: `sg-0923c68c0c42bb5fb` (used by both ALB and tasks). Inbound TCP 8000 should allow from this SG; HTTP/80 inbound on the task SG is not needed. Health check path is `/health` on traffic port 8000.
- ECR image: `516466084656.dkr.ecr.eu-north-1.amazonaws.com/zouheir/sof-ocr:latest`

## Update your app to use the service
- If fronted by an ALB/private DNS, keep the same host; otherwise set `SOF_OCR_ENDPOINT` in the Next.js app to the reachable URL (e.g., `http://<host>:8000/extract`).

## Textract setup (no placeholders)
Set env vars on the ECS task:
- `USE_TEXTRACT=true`
- `TEXTRACT_REGION=eu-north-1`

Task role for Textract:
```bash
# Create the task role
aws iam create-role \
  --role-name ocr-textract-task-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "ecs-tasks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach Textract permissions (full)
aws iam attach-role-policy \
  --role-name ocr-textract-task-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonTextractFullAccess
```

Register a new task definition revision with the task role (requires jq):
```bash
TD=$(aws ecs describe-services --cluster OCR --services ocr-service-qu9kzscy --query 'services[0].taskDefinition' --output text)

NEW_TD=$(aws ecs register-task-definition \
  --cli-input-json "$(aws ecs describe-task-definition \
    --task-definition $TD \
    --query 'taskDefinition' \
    --output json \
    | jq 'del(.status, .taskDefinitionArn, .requiresAttributes, .compatibilities, .revision, .registeredAt, .registeredBy)
      | .taskRoleArn = \"arn:aws:iam::516466084656:role/ocr-textract-task-role\"' )" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "New TD: $NEW_TD"
```

Update the service to use the new task definition:
```bash
aws ecs update-service \
  --cluster OCR \
  --service ocr-service-qu9kzscy \
  --task-definition "$NEW_TD" \
  --force-new-deployment
```
