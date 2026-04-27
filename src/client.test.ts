import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { SaudeAldeiaApiError, SaudeAldeiaClient } from "./client.js";

interface FetchCall {
	input: RequestInfo | URL;
	init: RequestInit | undefined;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		headers: { "content-type": "application/json" },
	});
}

function createFetchMock(
	responseFactory: (call: FetchCall) => Response | Promise<Response>,
) {
	const calls: FetchCall[] = [];
	const fetchMock: typeof fetch = async (input, init) => {
		const call = { input, init };
		calls.push(call);
		return await responseFactory(call);
	};

	return { fetchMock, calls };
}

function urlFromCall(call: FetchCall): URL {
	return new URL(String(call.input));
}

describe("SaudeAldeiaClient", () => {
	it("calls /v1/risk-index with validated query parameters", async () => {
		const payload = [
			{
				municipio: "São Paulo",
				estado: "SP",
				nivel_risco: "critico",
				score: 98,
			},
		];
		const { fetchMock, calls } = createFetchMock(() => jsonResponse(payload));
		const client = new SaudeAldeiaClient({
			baseUrl: "https://example.test/",
			fetch: fetchMock,
		});

		const result = await client.getRiskIndex({
			estado: "sp",
			municipio: "3550308",
			somente_altos: true,
			nivel_minimo: "critico",
			limite: 50,
		});

		assert.deepEqual(result, payload);
		assert.equal(calls.length, 1);
		const url = urlFromCall(calls[0] as FetchCall);
		assert.equal(url.origin, "https://example.test");
		assert.equal(url.pathname, "/v1/risk-index");
		assert.equal(url.searchParams.get("estado"), "SP");
		assert.equal(url.searchParams.get("municipio"), "3550308");
		assert.equal(url.searchParams.get("somente_altos"), "true");
		assert.equal(url.searchParams.get("nivel_minimo"), "critico");
		assert.equal(url.searchParams.get("limite"), "50");
		assert.equal(calls[0]?.init?.method, "GET");
	});

	it("calls /v1/high-alerts and supports object-shaped API responses", async () => {
		const payload = {
			alerts: [
				{
					municipio: "Campinas",
					codigo_ibge: "3509502",
					codigo_doenca: "DENG",
					nivel: "alto",
				},
			],
		};
		const { fetchMock, calls } = createFetchMock(() => jsonResponse(payload));
		const client = new SaudeAldeiaClient({ fetch: fetchMock });

		const result = await client.getHighAlerts({
			estado: "SP",
			doenca: "DENG",
			limite: 10,
		});

		assert.deepEqual(result, payload);
		const url = urlFromCall(calls[0] as FetchCall);
		assert.equal(url.pathname, "/v1/high-alerts");
		assert.equal(url.searchParams.get("doenca"), "DENG");
	});

	it("gets metadata and disease capability discovery", async () => {
		const { fetchMock, calls } = createFetchMock((call) => {
			const url = urlFromCall(call);
			if (url.pathname === "/v1/metadata") {
				return jsonResponse({
					source: "SINAN/OpenDataSUS",
					refreshed_at: "2026-01-01",
				});
			}
			return jsonResponse({ diseases: [{ code: "DENG", name: "Dengue" }] });
		});
		const client = new SaudeAldeiaClient({ fetch: fetchMock });

		assert.deepEqual(await client.getMetadata(), {
			source: "SINAN/OpenDataSUS",
			refreshed_at: "2026-01-01",
		});
		assert.deepEqual(await client.getDiseases(), {
			diseases: [{ code: "DENG", name: "Dengue" }],
		});
		assert.equal(urlFromCall(calls[0] as FetchCall).pathname, "/v1/metadata");
		assert.equal(urlFromCall(calls[1] as FetchCall).pathname, "/v1/diseases");
	});

	it("passes custom headers only when provided", async () => {
		const { fetchMock, calls } = createFetchMock(() => jsonResponse([]));
		const client = new SaudeAldeiaClient({
			fetch: fetchMock,
			headers: { "x-agent": "test-suite" },
		});

		await client.getRiskIndex();

		assert.deepEqual(calls[0]?.init?.headers, { "x-agent": "test-suite" });
	});

	it("throws ZodError before network calls for invalid geographic and enum parameters", async () => {
		const { fetchMock, calls } = createFetchMock(() => jsonResponse([]));
		const client = new SaudeAldeiaClient({ fetch: fetchMock });

		await assert.rejects(
			() =>
				client.getRiskIndex({
					estado: "Sao Paulo",
					nivel_minimo: "grave" as "critico",
				}),
			z.ZodError,
		);
		await assert.rejects(
			() => client.getHighAlerts({ municipio: "1", doenca: "COVID" as "DENG" }),
			z.ZodError,
		);
		assert.equal(calls.length, 0);
	});

	it("throws SaudeAldeiaApiError with parsed response body on HTTP errors", async () => {
		const errorBody = {
			detail: [
				{ loc: ["query", "estado"], msg: "invalid UF", type: "value_error" },
			],
		};
		const { fetchMock } = createFetchMock(() =>
			jsonResponse(errorBody, { status: 422 }),
		);
		const client = new SaudeAldeiaClient({ fetch: fetchMock });

		await assert.rejects(
			() => client.getRiskIndex({ estado: "SP" }),
			(error: unknown) =>
				error instanceof SaudeAldeiaApiError &&
				error.status === 422 &&
				JSON.stringify(error.response) === JSON.stringify(errorBody),
		);
	});

	it("throws SaudeAldeiaApiError with null body when an error response is not JSON", async () => {
		const { fetchMock } = createFetchMock(
			() => new Response("Gateway timeout", { status: 504 }),
		);
		const client = new SaudeAldeiaClient({ fetch: fetchMock });

		await assert.rejects(
			() => client.getHighAlerts({ estado: "SP" }),
			(error: unknown) =>
				error instanceof SaudeAldeiaApiError &&
				error.status === 504 &&
				error.response === null,
		);
	});

	it("propagates network failures from fetch", async () => {
		const networkError = new TypeError("fetch failed");
		const { fetchMock } = createFetchMock(async () => {
			throw networkError;
		});
		const client = new SaudeAldeiaClient({ fetch: fetchMock });

		await assert.rejects(() => client.getDiseases(), networkError);
	});

	it("throws ZodError when the API response does not match exported schemas", async () => {
		const { fetchMock } = createFetchMock(() =>
			jsonResponse([{ municipio: "São Paulo", nivel_risco: "emergencial" }]),
		);
		const client = new SaudeAldeiaClient({ fetch: fetchMock });

		await assert.rejects(
			() => client.getRiskIndex({ estado: "SP" }),
			z.ZodError,
		);
	});

	it("requires a Fetch API implementation when no custom or global fetch exists", () => {
		const originalFetch = globalThis.fetch;
		Object.defineProperty(globalThis, "fetch", {
			configurable: true,
			value: undefined,
			writable: true,
		});

		try {
			assert.throws(
				() => new SaudeAldeiaClient(),
				/A Fetch API implementation is required/,
			);
		} finally {
			Object.defineProperty(globalThis, "fetch", {
				configurable: true,
				value: originalFetch,
				writable: true,
			});
		}
	});
});
