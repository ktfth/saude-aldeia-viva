import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import {
	DiseaseCodeSchema,
	EstadoSchema,
	HighAlertsParamsSchema,
	MunicipioSchema,
	RiskIndexParamsSchema,
	RiskLevelSchema,
} from "./schemas.js";

describe("schemas", () => {
	it("normalizes UF abbreviations and accepts IBGE state codes", () => {
		assert.equal(EstadoSchema.parse("sp"), "SP");
		assert.equal(EstadoSchema.parse("35"), "35");
	});

	it("validates municipality names and DataSUS/IBGE codes", () => {
		assert.equal(
			MunicipioSchema.parse("São José dos Campos"),
			"São José dos Campos",
		);
		assert.equal(MunicipioSchema.parse("355030"), "355030");
		assert.equal(MunicipioSchema.parse("3550308"), "3550308");
		assert.throws(() => MunicipioSchema.parse("1"), z.ZodError);
		assert.throws(() => MunicipioSchema.parse("@@"), z.ZodError);
	});

	it("restricts disease and risk-level enums", () => {
		assert.equal(DiseaseCodeSchema.parse("DENG"), "DENG");
		assert.equal(RiskLevelSchema.parse("critico"), "critico");
		assert.throws(() => DiseaseCodeSchema.parse("MALARIA"), z.ZodError);
		assert.throws(() => RiskLevelSchema.parse("emergencial"), z.ZodError);
	});

	it("validates risk-index query limits and rejects unknown fields", () => {
		assert.deepEqual(
			RiskIndexParamsSchema.parse({
				estado: "sp",
				nivel_minimo: "alto",
				limite: 1000,
			}),
			{ estado: "SP", nivel_minimo: "alto", limite: 1000 },
		);
		assert.throws(() => RiskIndexParamsSchema.parse({ limite: 0 }), z.ZodError);
		assert.throws(
			() => RiskIndexParamsSchema.parse({ limite: 1001 }),
			z.ZodError,
		);
		assert.throws(
			() => RiskIndexParamsSchema.parse({ estado: "SP", extra: true }),
			z.ZodError,
		);
	});

	it("validates high-alert query disease codes", () => {
		assert.deepEqual(
			HighAlertsParamsSchema.parse({ estado: "SP", doenca: "ZIKA" }),
			{
				estado: "SP",
				doenca: "ZIKA",
			},
		);
		assert.throws(
			() => HighAlertsParamsSchema.parse({ doenca: "deng" }),
			z.ZodError,
		);
	});
});
