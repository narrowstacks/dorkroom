import { Unkey } from '@unkey/api';

type Tier = 'free' | 'standard' | 'partner';
type Command = 'create' | 'tier';

interface TierConfig {
  limit: number;
  duration: number;
}

const TIER_CONFIG: Record<Tier, TierConfig> = {
  free: { limit: 60, duration: 60_000 },
  standard: { limit: 300, duration: 60_000 },
  partner: { limit: 1_000_000_000, duration: 60_000 },
};

function printUsage(): void {
  console.log(`Usage:
  bun run keys:create -- --customer-id <id> --tier <free|standard|partner> [--name <name>] [--external-id <id>] [--prefix <prefix>]
  bun run keys:tier -- --key-id <key_id> --tier <free|standard|partner>

Required environment variables:
  UNKEY_ADMIN_ROOT_KEY
  UNKEY_API_ID
`);
}

function parseFlagArgs(args: string[]): Record<string, string> {
  const options: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token || !token.startsWith('--')) {
      throw new Error(`Invalid argument: ${token ?? '<empty>'}`);
    }

    const key = token.slice(2);
    const value = args[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    options[key] = value;
    index += 1;
  }

  return options;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireOption(options: Record<string, string>, name: string): string {
  const value = options[name];
  if (!value) {
    throw new Error(`Missing required option: --${name}`);
  }
  return value;
}

function parseTier(value: string): Tier {
  if (value === 'free' || value === 'standard' || value === 'partner') {
    return value;
  }

  throw new Error(
    `Invalid tier: ${value}. Expected free, standard, or partner.`
  );
}

function getUnkeyAdminClient(): { client: Unkey; apiId: string } {
  const rootKey = requireEnv('UNKEY_ADMIN_ROOT_KEY');
  const apiId = requireEnv('UNKEY_API_ID');

  return {
    client: new Unkey({ rootKey }),
    apiId,
  };
}

async function createKey(options: Record<string, string>): Promise<void> {
  const customerId = requireOption(options, 'customer-id');
  const tier = parseTier(requireOption(options, 'tier'));
  const externalId = options['external-id'] ?? customerId;
  const name = options.name ?? `customer-${customerId}`;
  const prefix = options.prefix;
  const { limit, duration } = TIER_CONFIG[tier];
  const { client, apiId } = getUnkeyAdminClient();

  const response = await client.keys.createKey({
    apiId,
    name,
    externalId,
    prefix,
    meta: { tier },
    ratelimits: [
      {
        name: 'requests',
        limit,
        duration,
        autoApply: true,
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        keyId: response.data.keyId,
        key: response.data.key,
        tier,
        externalId,
        ratelimit: { name: 'requests', limit, duration, autoApply: true },
      },
      null,
      2
    )
  );
}

async function updateTier(options: Record<string, string>): Promise<void> {
  const keyId = requireOption(options, 'key-id');
  const tier = parseTier(requireOption(options, 'tier'));
  const { limit, duration } = TIER_CONFIG[tier];
  const { client } = getUnkeyAdminClient();

  await client.keys.updateKey({
    keyId,
    meta: { tier },
    ratelimits: [
      {
        name: 'requests',
        limit,
        duration,
        autoApply: true,
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        keyId,
        tier,
        ratelimit: { name: 'requests', limit, duration, autoApply: true },
      },
      null,
      2
    )
  );
}

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined;
  const args = process.argv.slice(3);

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  if (command !== 'create' && command !== 'tier') {
    throw new Error(`Unknown command: ${command}`);
  }

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const options = parseFlagArgs(args);

  if (command === 'create') {
    await createKey(options);
    return;
  }

  await updateTier(options);
}

main().catch((cause: unknown) => {
  const message = cause instanceof Error ? cause.message : String(cause);
  console.error(`Unkey key management failed: ${message}`);
  printUsage();
  process.exit(1);
});
