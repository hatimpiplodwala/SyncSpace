# AWS Lambda container image for the compaction sweep.
# Base is AWS's managed Node 22 Lambda runtime (latest available managed Node;
# the web app/CI run Node 24, but Lambda's managed base lags upstream).
FROM public.ecr.aws/lambda/nodejs:22

# Install prod deps into the Lambda task root. `npm ci` is deterministic and
# integrity-checked against the committed lockfile.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Handler source.
COPY index.mjs ./

# <file>.<exported-handler>
CMD ["index.handler"]
