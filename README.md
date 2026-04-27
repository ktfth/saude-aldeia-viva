# Heatlh - Aldeia Viva

Type-first TypeScript client for the **Epidemiology Intelligence API** at `https://saude.aldeia-viva.com.br`.

API base URL: https://saude.aldeia-viva.com.br

- Native Fetch API: no HTTP runtime dependency.
- Zod schemas exported with inferred TypeScript types.
- JSR/npm-ready ESM package.
- Agent-friendly `getAgentTools()` definitions with JSON Schema inputs for OpenAI/Anthropic tool calling.
- Geographic filters validate municipality names and DataSUS/IBGE municipality codes, plus UF/IBGE state codes.

> The API uses SINAN/OpenDataSUS notification records. These indicators support epidemiological surveillance and should not be treated as individual medical diagnoses.

## Install

```bash
npm install @aldeia-viva/saude zod
```

JSR:

```bash
deno add jsr:@aldeia-viva/saude
```

## Usage

```ts
import { SaudeAldeiaClient } from "@aldeia-viva/saude";

const client = new SaudeAldeiaClient();

const risk = await client.getRiskIndex({
  estado: "SP",
  nivel_minimo: "critico",
  limite: 100,
});

const alerts = await client.getHighAlerts({
  estado: "SP",
  doenca: "DENG",
  limite: 1000,
});
```

## AI agent example

Answering: **"Quais cidades de SP estão em nível crítico de Dengue?"**

```ts
import { SaudeAldeiaClient, getAgentTools } from "@aldeia-viva/saude";

const client = new SaudeAldeiaClient();

// Register these definitions in an MCP adapter or tool-calling runtime.
const tools = getAgentTools();

// Agent-selected tool call:
const alerts = await client.getHighAlerts({
  estado: "SP",
  doenca: "DENG",
  limite: 1000,
});

const rows = Array.isArray(alerts)
  ? alerts
  : (alerts.alerts ?? alerts.data ?? alerts.results ?? []);

const criticalCities = rows
  .filter((row) => (row.nivel_risco ?? row.nivel) === "critico")
  .map((row) => ({
    municipio: row.municipio,
    codigo_ibge: row.codigo_ibge ?? row.codigo_municipio,
    total_notificacoes: row.total_notificacoes ?? row.total,
    score: row.score,
  }));

console.log(criticalCities);
```

## Exports

```ts
export {
  SaudeAldeiaClient,
  SaudeAldeiaApiError,
  getAgentTools,
  RiskIndexParamsSchema,
  HighAlertsParamsSchema,
  RiskIndexResponseSchema,
  HighAlertsResponseSchema,
  MetadataResponseSchema,
  DiseasesResponseSchema,
};
```

All schemas have matching inferred types, such as `RiskIndexParams`, `RiskIndexResponse`, `HighAlertsParams`, and `HighAlertsResponse`.

## API methods

- `getRiskIndex(params)` maps to `GET /v1/risk-index`.
- `getHighAlerts(params)` maps to `GET /v1/high-alerts`.
- `getMetadata()` maps to `GET /v1/metadata`.
- `getDiseases()` maps to `GET /v1/diseases`.

## Runtime support

The package expects a native Fetch API implementation. Node.js 18.17+, Deno, Bun, Cloudflare Workers, and modern browsers provide `fetch` globally. Tests or older runtimes can pass a custom `fetch` implementation to `new SaudeAldeiaClient({ fetch })`.

## Automated publishing

This repository includes `.github/workflows/publish.yml` to keep npm and JSR in sync from `ktfth/saude-aldia-viva`.

Main-branch flow:

1. Install dependencies once with `npm install`; this configures `.githooks` through `core.hooksPath`.
2. Commit normally on `main`; `.githooks/pre-commit` bumps the patch version in `package.json`, `package-lock.json`, and `jsr.json` and stages those files into the same commit.
3. Push to `main`; `.githooks/pre-push` only verifies that the local version differs from the remote `main` version. It no longer mutates files during push.
4. The workflow validates metadata, tests, build output, npm pack contents, and JSR dry-run contents.
5. If the version is not already published, it publishes:
   - npm: `@aldeia-viva/saude`
   - JSR: `@aldeia-viva/saude`

Release flow is also supported: create a GitHub Release tagged as `v<version>`, for example `v0.1.0`.

Registry authentication:

- Prefer trusted publishing/OIDC for both npm and JSR.
- If npm trusted publishing is not configured yet, add a repository secret named `NPM_TOKEN`.
- JSR publishing uses GitHub Actions OIDC through `npx jsr publish`.

Manual validation is available in GitHub Actions via `workflow_dispatch` with `dry_run: true`.

To intentionally bypass the local version hooks, prefix the command with `SKIP_VERSION_BUMP=1`, for example `SKIP_VERSION_BUMP=1 git push origin main`.
