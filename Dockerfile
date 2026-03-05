FROM oven/bun:1.3.3

RUN apt-get update && apt-get install -y --no-install-recommends iptables && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig*.json ./
COPY apps/dorkroom/package.json apps/dorkroom/
COPY packages/ui/package.json packages/ui/
COPY packages/logic/package.json packages/logic/
COPY packages/api/package.json packages/api/

RUN bun install --frozen-lockfile

COPY . .

EXPOSE 4200

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["bun", "run", "dev"]
