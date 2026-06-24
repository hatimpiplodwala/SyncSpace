# AWS compaction Lambda

Scheduled AWS Lambda that folds each room's Yjs append log into its snapshot —
the always-free replacement for the Supabase `compact-room` edge function and its
`pg_net` trigger.

```
EventBridge (rate: 1h) ──▶ Lambda (container) ──▶ Supabase Postgres
                                  │                 rooms_pending_compaction()
                                  └─ folds room_updates → room_snapshots
```

Primary app hosting stays on Vercel + Supabase. This is an independent,
AWS-native background job.

## Why this is free

| Service | Free allowance | This workload |
| --- | --- | --- |
| Lambda | 1M requests + 400k GB-s / month, **always free** | ~720 invocations/month at `rate(1 hour)` |
| EventBridge | 14M scheduled invocations / month, always free | 720/month |
| CloudWatch Logs | 5 GB ingest / month free | tiny JSON summaries |
| ECR (private) | 500 MB free for 12 months, then ~$0.10/GB-mo | one small image; lifecycle keeps ≤5 |

ECR is the only line that can bill after 12 months, and only a couple of cents
for a single small image. Everything else is always-free.

## Layout

- `lambda/compact/` — Node handler (`index.mjs`) + container `Dockerfile`.
- `terraform/` — all infra: GitHub OIDC provider, scoped deploy role, ECR repo,
  Lambda, execution role, and the EventBridge schedule.

## Secrets

The Supabase service-role key is stored as an encrypted **SSM SecureString**
(`/<project>/supabase_service_role_key`), not as a plaintext Lambda env var. The
Lambda fetches it at cold start; reading it requires `ssm:GetParameter` +
`kms:Decrypt`. You still paste the key into `terraform.tfvars` once — Terraform
writes it to SSM (the value also lands in local, gitignored Terraform state).

## One-time setup

Prereqs: AWS CLI logged in with admin-ish creds, Docker, Terraform ≥ 1.6.

```bash
cd aws/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in repo, region, Supabase URL + service-role key
terraform init

# 1) Create the ECR repo first (the Lambda needs an image to exist).
terraform apply -target=aws_ecr_repository.this

# 2) Build + push the initial image with your local AWS creds.
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=$(terraform output -raw aws_region)
REPO=$(terraform output -raw ecr_repository)
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"
docker build -t "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$REPO:latest" ../lambda/compact
docker push "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$REPO:latest"

# 3) Create everything else (Lambda, roles, schedule).
terraform apply
```

Then apply the DB migration that retires the old trigger and adds the RPC:

```bash
supabase db push   # applies 0006_retire_pgnet_compaction.sql
```

## Wire up CI

Set these as GitHub **repo variables** (Settings → Secrets and variables →
Actions → Variables) from the Terraform outputs — they are not secrets:

| Variable | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw deploy_role_arn` |
| `AWS_REGION` | `terraform output -raw aws_region` |
| `ECR_REPOSITORY` | `terraform output -raw ecr_repository` |
| `LAMBDA_FUNCTION_NAME` | `terraform output -raw lambda_function_name` |

After that, every push to `main` touching `aws/lambda/**` builds and ships a new
image via [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — no
stored AWS keys.

## Verify

```bash
aws lambda invoke --function-name "$(terraform output -raw lambda_function_name)" /dev/stdout
# → {"rooms_scanned":N,"rooms_compacted":M,"updates_folded":K,"failures":0}
```

## Tuning

- Cadence: `schedule_expression` (e.g. `rate(15 minutes)`, `cron(0 * * * ? *)`).
- Fold threshold: `compaction_min_updates` (must match the `rooms_pending_compaction` default if you call it elsewhere).
- Memory/CPU: `lambda_memory_mb` — Yjs replay is CPU-bound, and Lambda scales CPU with memory.
