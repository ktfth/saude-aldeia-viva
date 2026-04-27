export interface AgentToolDefinition {
	name: string;
	description: string;
	/** JSON Schema input definition compatible with Anthropic `input_schema`. */
	input_schema: Record<string, unknown>;
	/** Same JSON Schema exposed under OpenAI's function-calling field name. */
	parameters: Record<string, unknown>;
}

const geoProperties = {
	municipio: {
		type: "string",
		description:
			"Partial municipality name or DataSUS/IBGE municipality code. Accepts six-digit DataSUS codes and seven-digit IBGE codes.",
		pattern: "^(\\d{6,7}|[\\p{L}\\p{M}\\s.'-]{2,})$",
	},
	estado: {
		type: "string",
		description:
			"Brazilian state UF abbreviation such as SP, or the two-digit IBGE state code.",
		pattern: "^([A-Za-z]{2}|\\d{2})$",
	},
} as const;

const limitProperty = {
	type: "integer",
	minimum: 1,
	maximum: 1000,
	default: 100,
	description: "Maximum number of records to return.",
} as const;

const riskIndexInputSchema = {
	type: "object",
	additionalProperties: false,
	properties: {
		...geoProperties,
		somente_altos: {
			type: "boolean",
			description:
				"Return only municipalities with at least one disease in high or critical risk.",
			default: false,
		},
		nivel_minimo: {
			type: "string",
			enum: ["baixo", "moderado", "alto", "critico"],
			description: "Minimum risk level to include in the response.",
		},
		limite: limitProperty,
	},
} as const;

const highAlertsInputSchema = {
	type: "object",
	additionalProperties: false,
	properties: {
		...geoProperties,
		doenca: {
			type: "string",
			enum: ["DENG", "CHIK", "ZIKA"],
			description:
				"Disease code: DENG for dengue, CHIK for chikungunya, or ZIKA for Zika virus disease.",
		},
		limite: limitProperty,
	},
} as const;

const emptyInputSchema = {
	type: "object",
	additionalProperties: false,
	properties: {},
} as const;

/**
 * Return MCP-ready tool definitions for AI agents.
 *
 * The definitions expose JSON Schema under both `input_schema` (Anthropic-style tools) and
 * `parameters` (OpenAI function calling). Tool executors can map each `name` to the matching
 * `SaudeAldeiaClient` method.
 */
export function getAgentTools(): AgentToolDefinition[] {
	return [
		{
			name: "getRiskIndex",
			description:
				"Fetch municipality-level epidemiological risk indices from SINAN/OpenDataSUS-derived data.",
			input_schema: riskIndexInputSchema,
			parameters: riskIndexInputSchema,
		},
		{
			name: "getHighAlerts",
			description:
				"Fetch high or critical municipality/disease epidemiological alerts, optionally filtered by disease.",
			input_schema: highAlertsInputSchema,
			parameters: highAlertsInputSchema,
		},
		{
			name: "getMetadata",
			description:
				"Fetch metadata about data freshness, source loading, and aggregation capabilities.",
			input_schema: emptyInputSchema,
			parameters: emptyInputSchema,
		},
		{
			name: "getDiseases",
			description: "Discover supported diseases/viruses and their API codes.",
			input_schema: emptyInputSchema,
			parameters: emptyInputSchema,
		},
	];
}
