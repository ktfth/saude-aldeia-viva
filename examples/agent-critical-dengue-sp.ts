import { getAgentTools, SaudeAldeiaClient } from "../src/index.js";

const client = new SaudeAldeiaClient();

// Tool discovery step for an AI agent / MCP adapter.
const tools = getAgentTools();
console.log(tools.map((tool) => tool.name));

// User question: "Quais cidades de SP estão em nível crítico de Dengue?"
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

console.log("Cidades de SP em nível crítico para Dengue:", criticalCities);
