import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAgentTools } from "./tools.js";

describe("getAgentTools", () => {
	it("returns OpenAI/Anthropic-compatible tool definitions", () => {
		const tools = getAgentTools();
		assert.deepEqual(
			tools.map((tool) => tool.name),
			["getRiskIndex", "getHighAlerts", "getMetadata", "getDiseases"],
		);

		for (const tool of tools) {
			assert.equal(typeof tool.description, "string");
			assert.equal(tool.input_schema.type, "object");
			assert.equal(tool.parameters, tool.input_schema);
		}
	});

	it("exposes geographic JSON Schema constraints and API enums", () => {
		const [riskIndex, highAlerts] = getAgentTools();
		assert.ok(riskIndex);
		assert.ok(highAlerts);

		const riskProperties = riskIndex.input_schema.properties as Record<
			string,
			Record<string, unknown>
		>;
		const alertProperties = highAlerts.input_schema.properties as Record<
			string,
			Record<string, unknown>
		>;

		assert.deepEqual(riskProperties.nivel_minimo?.enum, [
			"baixo",
			"moderado",
			"alto",
			"critico",
		]);
		assert.deepEqual(alertProperties.doenca?.enum, ["DENG", "CHIK", "ZIKA"]);
		assert.equal(riskProperties.estado?.pattern, "^([A-Za-z]{2}|\\d{2})$");
		assert.equal(
			riskProperties.municipio?.pattern,
			"^(\\d{6,7}|[\\p{L}\\p{M}\\s.'-]{2,})$",
		);
		assert.equal(riskProperties.limite?.maximum, 1000);
	});
});
