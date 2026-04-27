import type { z } from "zod";
import {
	DEFAULT_BASE_URL,
	type DiseasesResponse,
	DiseasesResponseSchema,
	type HighAlertsParams,
	HighAlertsParamsSchema,
	type HighAlertsResponse,
	HighAlertsResponseSchema,
	type MetadataResponse,
	MetadataResponseSchema,
	type RiskIndexParams,
	RiskIndexParamsSchema,
	type RiskIndexResponse,
	RiskIndexResponseSchema,
} from "./schemas.js";

export interface SaudeAldeiaClientOptions {
	/** Base URL for the API. Defaults to the production Epidemiology Intelligence API. */
	baseUrl?: string;
	/** Optional Fetch implementation for tests, edge runtimes, or custom observability. */
	fetch?: typeof fetch;
	/** Optional headers sent with every request, for example a custom User-Agent in Node.js. */
	headers?: HeadersInit;
}

/** Error thrown when the API returns a non-2xx HTTP status code. */
export class SaudeAldeiaApiError extends Error {
	readonly status: number;
	readonly response: unknown;

	constructor(status: number, response: unknown) {
		super(`Saude Aldeia API request failed with HTTP ${status}`);
		this.name = "SaudeAldeiaApiError";
		this.status = status;
		this.response = response;
	}
}

/**
 * Type-first client for the Epidemiology Intelligence API.
 *
 * The API exposes municipality-level epidemiological intelligence derived from SINAN/OpenDataSUS
 * notification records. These data support surveillance and situational awareness; they should not
 * be interpreted as individual diagnoses or as a substitute for official public-health decisions.
 */
export class SaudeAldeiaClient {
	readonly baseUrl: string;
	readonly headers: HeadersInit | undefined;
	readonly fetchImpl: typeof fetch;

	constructor(options: SaudeAldeiaClientOptions = {}) {
		this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
		this.headers = options.headers;
		this.fetchImpl = options.fetch ?? globalThis.fetch;

		if (typeof this.fetchImpl !== "function") {
			throw new TypeError(
				"A Fetch API implementation is required in this runtime",
			);
		}
	}

	/**
	 * Get enriched epidemiological risk indices by municipality.
	 *
	 * `municipio` accepts a partial municipality name or a DataSUS/IBGE municipality code. `estado`
	 * accepts a UF abbreviation such as `SP` or a two-digit IBGE state code. The returned totals and
	 * scores are derived from SINAN/OpenDataSUS notifications and grouped into risk levels (`baixo`,
	 * `moderado`, `alto`, `critico`) to help identify municipalities needing surveillance attention.
	 */
	async getRiskIndex(params: RiskIndexParams = {}): Promise<RiskIndexResponse> {
		const query = RiskIndexParamsSchema.parse(params);
		return await this.get("/v1/risk-index", query, RiskIndexResponseSchema);
	}

	/**
	 * Get municipality/disease combinations currently classified as high or critical alerts.
	 *
	 * Use `doenca` to filter by arbovirus code: `DENG` for dengue, `CHIK` for chikungunya, or `ZIKA`
	 * for Zika virus disease. Alerts consolidate SINAN/OpenDataSUS notification patterns into a
	 * practical list for epidemiological triage.
	 */
	async getHighAlerts(
		params: HighAlertsParams = {},
	): Promise<HighAlertsResponse> {
		const query = HighAlertsParamsSchema.parse(params);
		return await this.get("/v1/high-alerts", query, HighAlertsResponseSchema);
	}

	/**
	 * Get metadata about the epidemiological data load.
	 *
	 * Metadata can include source freshness, cache status, aggregation windows, and other operational
	 * details that help agents explain how current the SINAN/OpenDataSUS-derived indicators are.
	 */
	async getMetadata(): Promise<MetadataResponse> {
		return await this.get("/v1/metadata", {}, MetadataResponseSchema);
	}

	/**
	 * Get the diseases and public-health conditions supported by the API.
	 *
	 * Agents can call this method during capability discovery to learn which disease names and codes
	 * are available before constructing risk or alert queries.
	 */
	async getDiseases(): Promise<DiseasesResponse> {
		return await this.get("/v1/diseases", {}, DiseasesResponseSchema);
	}

	private async get<T>(
		path: string,
		query: object,
		schema: z.ZodType<T>,
	): Promise<T> {
		const url = new URL(`${this.baseUrl}${path}`);

		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined && value !== null) {
				url.searchParams.set(key, String(value));
			}
		}

		const requestInit: RequestInit = { method: "GET" };
		if (this.headers !== undefined) {
			requestInit.headers = this.headers;
		}

		const response = await this.fetchImpl(url, requestInit);
		const body: unknown = await response.json().catch(() => null);

		if (!response.ok) {
			throw new SaudeAldeiaApiError(response.status, body);
		}

		return schema.parse(body);
	}
}
