import { Unkey } from '@unkey/api';
import {
  getRateLimitNamespace,
  KEY_TIERS,
  type KeyTier,
  RATE_WINDOW_MS,
  type RateLimitScope,
  SCOPE_DEFAULT_LIMIT,
} from '../utils/rateLimitPolicy';

type Command = 'create' | 'tier' | 'anon-bootstrap';

function printUsage(): void {
  console.log(`Usage:
  bun run keys:create -- --customer-id <id> --tier <free|standard|partner> [--name <name>] [--external-id <id>] [--prefix <prefix>]
  bun run keys:tier -- --key-id <key_id> --tier <free|standard|partner>
  bun run keys:anon-bootstrap -- [--scope <anonymous|client>] [--namespace <name>] [--identifier <id>] [--limit <n>] [--duration <ms>]

Tier limits and namespaces come from utils/rateLimitPolicy.ts:
  free -> ${KEY_TIERS.free.limit} req/min, standard -> ${KEY_TIERS.standard.limit} req/min
  --scope anonymous (default) -> UNKEY_ANON_NAMESPACE, else <UNKEY_API_ID>-anonymous
  --scope client -> UNKEY_CLIENT_NAMESPACE, else <UNKEY_API_ID>-client

Default key prefixes by tier:
  free -> dk_f_
  standard -> dk_s_
  partner -> dk_e_

Required environment variables:
  For keys:create and keys:tier:
  UNKEY_ADMIN_ROOT_KEY
  UNKEY_API_ID
  UNKEY_API_KEY_PERMISSION
  For keys:anon-bootstrap:
  UNKEY_ROOT_KEY
  UNKEY_API_ID
`);
}

/** `--flag value` pairs from argv, keyed by flag name without the dashes. */
interface FlagOptions {
  [flag: string]: string;
}

function parseFlagArgs(args: string[]): FlagOptions {
  const options: FlagOptions = {};

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

function requireOption(options: FlagOptions, name: string): string {
  const value = options[name];
  if (!value) {
    throw new Error(`Missing required option: --${name}`);
  }
  return value;
}

function parseCommand(value: string): Command {
  if (value === 'create' || value === 'tier' || value === 'anon-bootstrap') {
    return value;
  }

  throw new Error(`Unknown command: ${value}`);
}

function parseTier(value: string): KeyTier {
  if (value === 'free' || value === 'standard' || value === 'partner') {
    return value;
  }

  throw new Error(
    `Invalid tier: ${value}. Expected free, standard, or partner.`
  );
}

function parseOptionalPositiveInt(
  options: FlagOptions,
  name: string
): number | undefined {
  const value = options[name];
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid --${name}: ${value}. Expected a positive integer.`
    );
  }

  return parsed;
}

function getUnkeyAdminClient() {
  const rootKey = requireEnv('UNKEY_ADMIN_ROOT_KEY');
  const apiId = requireEnv('UNKEY_API_ID');
  const keyPermission = requireEnv('UNKEY_API_KEY_PERMISSION');

  return {
    client: new Unkey({ rootKey }),
    apiId,
    keyPermission,
  };
}

function getUnkeyRuntimeClient() {
  const rootKey = requireEnv('UNKEY_ROOT_KEY');
  // Required so the namespace resolves to `${UNKEY_API_ID}-<scope>` like the
  // deployed runtime, never the `dorkroom-<scope>` local-dev fallback.
  requireEnv('UNKEY_API_ID');

  return { client: new Unkey({ rootKey }) };
}

async function createKey(options: FlagOptions): Promise<void> {
  const customerId = requireOption(options, 'customer-id');
  const tier = parseTier(requireOption(options, 'tier'));
  const externalId = options['external-id'] ?? customerId;
  const name = options.name ?? `customer-${customerId}`;
  const { limit, duration, defaultPrefix } = KEY_TIERS[tier];
  const prefix = options.prefix ?? defaultPrefix;
  const { client, apiId, keyPermission } = getUnkeyAdminClient();

  const response = await client.keys.createKey({
    apiId,
    name,
    externalId,
    prefix,
    meta: { tier },
    permissions: [keyPermission],
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
        permission: keyPermission,
        ratelimit: { name: 'requests', limit, duration, autoApply: true },
      },
      null,
      2
    )
  );
}

async function updateTier(options: FlagOptions): Promise<void> {
  const keyId = requireOption(options, 'key-id');
  const tier = parseTier(requireOption(options, 'tier'));
  const { limit, duration } = KEY_TIERS[tier];
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

function parseScope(value: string | undefined): RateLimitScope {
  if (value === undefined || value === 'anonymous') {
    return 'anonymous';
  }
  if (value === 'client') {
    return 'client';
  }

  throw new Error(`Invalid scope: ${value}. Expected anonymous or client.`);
}

/**
 * Touches a ratelimit namespace once so Unkey creates it, resolving the name
 * exactly as the runtime does. The runtime key lacks `create_namespace` in
 * production on purpose, so both namespaces must exist before deploy.
 */
async function bootstrapNamespace(options: FlagOptions): Promise<void> {
  const { client } = getUnkeyRuntimeClient();
  const scope = parseScope(options.scope);
  const namespace = options.namespace?.trim() || getRateLimitNamespace(scope);
  const identifier = options.identifier?.trim() || 'bootstrap-check';
  const limit =
    parseOptionalPositiveInt(options, 'limit') ?? SCOPE_DEFAULT_LIMIT[scope];
  const duration =
    parseOptionalPositiveInt(options, 'duration') ?? RATE_WINDOW_MS;

  const response = await client.ratelimit.limit({
    namespace,
    identifier,
    limit,
    duration,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        scope,
        namespace,
        identifier,
        limit,
        duration,
        ratelimit: response.data,
      },
      null,
      2
    )
  );
}

async function main(): Promise<void> {
  const requested = process.argv[2];
  const args = process.argv.slice(3);

  if (!requested || requested === '--help' || requested === '-h') {
    printUsage();
    process.exit(0);
  }

  const command = parseCommand(requested);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const options = parseFlagArgs(args);

  if (command === 'create') {
    await createKey(options);
    return;
  }

  if (command === 'tier') {
    await updateTier(options);
    return;
  }

  await bootstrapNamespace(options);
}

main().catch((cause: unknown) => {
  const message = cause instanceof Error ? cause.message : String(cause);
  console.error(`Unkey CLI failed: ${message}`);
  printUsage();
  process.exit(1);
});
