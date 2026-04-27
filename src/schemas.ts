import { z } from "zod";

/** Production endpoint for the Epidemiology Intelligence API. */
export const DEFAULT_BASE_URL = "https://saude.aldeia-viva.com.br";

export type DiseaseCode = "DENG" | "CHIK" | "ZIKA";
export type RiskLevel = "baixo" | "moderado" | "alto" | "critico";
export type HighAlertRiskLevel = Extract<RiskLevel, "alto" | "critico">;

export interface RiskIndexParams {
	municipio?: string | undefined;
	estado?: string | undefined;
	somente_altos?: boolean | undefined;
	nivel_minimo?: RiskLevel | undefined;
	limite?: number | undefined;
}

export type RiskIndexQuery = RiskIndexParams;

export interface HighAlertsParams {
	municipio?: string | undefined;
	estado?: string | undefined;
	doenca?: DiseaseCode | undefined;
	limite?: number | undefined;
}

export type HighAlertsQuery = HighAlertsParams;

export interface DiseaseMetric {
	doenca?: string | undefined;
	codigo?: string | undefined;
	total?: number | undefined;
	notificacoes?: number | undefined;
	score?: number | undefined;
	nivel?: RiskLevel | undefined;
	nivel_risco?: RiskLevel | undefined;
	[key: string]: unknown;
}

export interface RiskIndexItem {
	municipio?: string | undefined;
	estado?: string | undefined;
	uf?: string | undefined;
	codigo_municipio?: string | undefined;
	codigo_ibge?: string | undefined;
	total?: number | undefined;
	total_notificacoes?: number | undefined;
	score?: number | undefined;
	nivel?: RiskLevel | undefined;
	nivel_risco?: RiskLevel | undefined;
	doencas?: DiseaseMetric[] | Record<string, DiseaseMetric> | undefined;
	[key: string]: unknown;
}

export type RiskIndexObjectResponse = {
	data?: RiskIndexItem[] | undefined;
	results?: RiskIndexItem[] | undefined;
	items?: RiskIndexItem[] | undefined;
	[key: string]: unknown;
};

export type RiskIndexResponse = RiskIndexItem[] | RiskIndexObjectResponse;

export interface HighAlertItem {
	municipio?: string | undefined;
	estado?: string | undefined;
	uf?: string | undefined;
	codigo_municipio?: string | undefined;
	codigo_ibge?: string | undefined;
	doenca?: string | undefined;
	codigo_doenca?: DiseaseCode | undefined;
	total?: number | undefined;
	total_notificacoes?: number | undefined;
	score?: number | undefined;
	nivel?: HighAlertRiskLevel | undefined;
	nivel_risco?: HighAlertRiskLevel | undefined;
	[key: string]: unknown;
}

export type HighAlertsObjectResponse = {
	data?: HighAlertItem[] | undefined;
	results?: HighAlertItem[] | undefined;
	alerts?: HighAlertItem[] | undefined;
	[key: string]: unknown;
};

export type HighAlertsResponse = HighAlertItem[] | HighAlertsObjectResponse;
export type MetadataResponse = Record<string, unknown>;
export type DiseasesResponse = Record<string, unknown>;

/** Supported arbovirus codes exposed by the API. */
export const DiseaseCodeSchema: z.ZodEnum<["DENG", "CHIK", "ZIKA"]> = z.enum([
	"DENG",
	"CHIK",
	"ZIKA",
]);

/** Risk levels returned by the API, ordered from lowest to highest public-health concern. */
export const RiskLevelSchema: z.ZodEnum<
	["baixo", "moderado", "alto", "critico"]
> = z.enum(["baixo", "moderado", "alto", "critico"]);

/**
 * Brazilian state filter.
 *
 * Accepts either a two-letter UF abbreviation such as `SP` or the two-digit IBGE state code.
 */
export const EstadoSchema: z.ZodType<string> = z
	.string()
	.trim()
	.min(1)
	.refine((value) => /^[A-Za-z]{2}$/.test(value) || /^\d{2}$/.test(value), {
		message:
			"estado must be a UF abbreviation (SP) or a two-digit IBGE state code",
	})
	.transform((value) =>
		/^[A-Za-z]{2}$/.test(value) ? value.toUpperCase() : value,
	);

/**
 * Brazilian municipality filter.
 *
 * Accepts a partial municipality name or a numeric DataSUS/IBGE municipality code. DataSUS commonly
 * uses six digits, while full IBGE municipality identifiers use seven digits including the check digit.
 */
export const MunicipioSchema: z.ZodType<string> = z
	.string()
	.trim()
	.min(1)
	.refine(
		(value) =>
			/^\d{6,7}$/.test(value) || /^[\p{L}\p{M}\s.'-]{2,}$/u.test(value),
		{
			message:
				"municipio must be a partial name or a 6/7 digit DataSUS/IBGE municipality code",
		},
	);

const LimiteSchema: z.ZodDefault<z.ZodNumber> = z
	.number()
	.int()
	.min(1)
	.max(1000)
	.default(100);

/** Query parameters for `/v1/risk-index`. */
export const RiskIndexParamsSchema: z.ZodType<RiskIndexQuery> = z
	.object({
		municipio: MunicipioSchema.optional(),
		estado: EstadoSchema.optional(),
		/** Return only municipalities with at least one disease in high or critical risk. */
		somente_altos: z.boolean().optional(),
		/** Minimum risk level to include in the response. */
		nivel_minimo: RiskLevelSchema.optional(),
		/** Maximum number of municipalities to return. */
		limite: LimiteSchema.optional(),
	})
	.strict();

/** Query parameters for `/v1/high-alerts`. */
export const HighAlertsParamsSchema: z.ZodType<HighAlertsQuery> = z
	.object({
		municipio: MunicipioSchema.optional(),
		estado: EstadoSchema.optional(),
		/** Disease code: DENG (dengue), CHIK (chikungunya), or ZIKA. */
		doenca: DiseaseCodeSchema.optional(),
		/** Maximum number of alerts to return. */
		limite: LimiteSchema.optional(),
	})
	.strict();

/**
 * Epidemiological metrics for one disease in one municipality.
 *
 * The API is backed by SINAN/OpenDataSUS notifications. Counts represent notified suspected or
 * confirmed cases available in the source data, not necessarily final laboratory-confirmed cases.
 */
export const DiseaseMetricSchema: z.ZodType<DiseaseMetric> = z
	.object({
		doenca: z.string().optional(),
		codigo: z.string().optional(),
		total: z.number().optional(),
		notificacoes: z.number().optional(),
		score: z.number().optional(),
		nivel: RiskLevelSchema.optional(),
		nivel_risco: RiskLevelSchema.optional(),
	})
	.passthrough();

/**
 * Risk-index record for a municipality.
 *
 * `score` is an enriched indicator derived from SINAN/OpenDataSUS notifications and aggregation
 * logic from the API. `nivel_risco` classifies the municipality into a human-readable risk band.
 */
export const RiskIndexItemSchema: z.ZodType<RiskIndexItem> = z
	.object({
		municipio: z.string().optional(),
		estado: z.string().optional(),
		uf: z.string().optional(),
		codigo_municipio: z.string().optional(),
		codigo_ibge: z.string().optional(),
		total: z.number().optional(),
		total_notificacoes: z.number().optional(),
		score: z.number().optional(),
		nivel: RiskLevelSchema.optional(),
		nivel_risco: RiskLevelSchema.optional(),
		doencas: z
			.union([z.array(DiseaseMetricSchema), z.record(DiseaseMetricSchema)])
			.optional(),
	})
	.passthrough();

/** Flexible API response for `/v1/risk-index` because the OpenAPI schema is intentionally open. */
export const RiskIndexResponseSchema: z.ZodType<RiskIndexResponse> = z.union([
	z.array(RiskIndexItemSchema),
	z
		.object({
			data: z.array(RiskIndexItemSchema).optional(),
			results: z.array(RiskIndexItemSchema).optional(),
			items: z.array(RiskIndexItemSchema).optional(),
		})
		.passthrough(),
]);

/**
 * Consolidated high/critical alert for one municipality and disease.
 *
 * High alerts indicate disease/virus combinations whose recent notification pattern deserves
 * attention from epidemiological surveillance teams.
 */
export const HighAlertItemSchema: z.ZodType<HighAlertItem> = z
	.object({
		municipio: z.string().optional(),
		estado: z.string().optional(),
		uf: z.string().optional(),
		codigo_municipio: z.string().optional(),
		codigo_ibge: z.string().optional(),
		doenca: z.string().optional(),
		codigo_doenca: DiseaseCodeSchema.optional(),
		total: z.number().optional(),
		total_notificacoes: z.number().optional(),
		score: z.number().optional(),
		nivel: z.enum(["alto", "critico"]).optional(),
		nivel_risco: z.enum(["alto", "critico"]).optional(),
	})
	.passthrough();

/** Flexible API response for `/v1/high-alerts`. */
export const HighAlertsResponseSchema: z.ZodType<HighAlertsResponse> = z.union([
	z.array(HighAlertItemSchema),
	z
		.object({
			data: z.array(HighAlertItemSchema).optional(),
			results: z.array(HighAlertItemSchema).optional(),
			alerts: z.array(HighAlertItemSchema).optional(),
		})
		.passthrough(),
]);

/** Metadata response describing data load, source freshness, and aggregation capabilities. */
export const MetadataResponseSchema: z.ZodType<MetadataResponse> = z.record(
	z.unknown(),
);

/** Diseases response listing supported diseases/viruses and their API codes. */
export const DiseasesResponseSchema: z.ZodType<DiseasesResponse> = z.record(
	z.unknown(),
);
