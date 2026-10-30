import { writeFileSync } from "node:fs";
import { cpus, platform, release } from "node:os";
import { performance } from "node:perf_hooks";
import { expect, test } from "vitest";
import { ApproximateRoutingProvider } from "@/adapters/routing/approximate";
import { generatePlan, routingInputForDraft } from "@/domain/planning/engine";
import { fixedClock, plannerDraft, plannerStop } from "../fixtures/planner";
import type { MatrixResult } from "@/domain/ports/providers";

test("prepared directed matrices satisfy NFR-03 across the bounded fixture grid", async () => {
  const context = { clock: fixedClock, seed: 42, plan_run_id: "synthetic-benchmark" };
  const samples = 20, warmups = 3;
  const percentile = (values: number[], quantile: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * quantile) - 1];
  const rows = [];
  for (const count of [0, 1, 2, 10, 15, 30]) for (let days = 1; days <= 7; days++) {
    const draft = plannerDraft({ end_date: `2026-11-${String(5 + days).padStart(2, "0")}`, pace: "active", stops: Array.from({ length: count }, (_, index) => plannerStop(`stop-${index}`, { is_required: index % 3 === 0, location: { lat: 12.24 + index / 1000, lng: 109.19 + index / 2000 } })) });
    const input = routingInputForDraft(draft);
    const matrix: MatrixResult = {
      node_ids: input.nodes.map(node => node.id), elements_requested: 0, warnings: ["SYNTHETIC_BENCHMARK"],
      cells: input.nodes.map((_, from) => input.nodes.map((__, to) => ({ status: "reachable", duration_minutes: from === to ? 0 : 3 + (from * 7 + to * 13) % 31, estimate_source: "approximate", uncertainty: "high" }))),
    };
    const expected = generatePlan(draft, matrix, context);
    for (let warmup = 0; warmup < warmups; warmup++) generatePlan(draft, matrix, context);
    const engineMs: number[] = [], matrixMs: number[] = [];
    for (let sample = 0; sample < samples; sample++) {
      const preparedAt = performance.now();
      await new ApproximateRoutingProvider().estimateMatrix(input);
      matrixMs.push(performance.now() - preparedAt);
      const started = performance.now();
      const result = generatePlan(draft, matrix, context);
      engineMs.push(performance.now() - started);
      expect(result).toEqual(expected);
    }
    expect(expected.status).toBe("candidate");
    const selectedIds = [...(expected.status === "candidate" ? expected.candidate.days.flatMap(day => day.stops.map(stop => stop.stop_id)) : []), ...expected.unscheduled.map(stop => stop.stop_id)];
    expect(selectedIds.sort()).toEqual(draft.stops.map(stop => stop.id).sort());
    rows.push({ stops: count, days, matrix_elements_reserved: (count + 1) ** 2, external_elements_requested: 0, engine_p50_ms: percentile(engineMs, 0.5), engine_p95_ms: percentile(engineMs, 0.95), engine_max_ms: Math.max(...engineMs), approximate_matrix_p95_ms: percentile(matrixMs, 0.95) });
  }
  writeFileSync("docs/reports/evidence/P04-05-benchmark.json", JSON.stringify({ measured_at: new Date().toISOString(), node: process.version, platform: platform(), os_release: release(), cpu: cpus()[0]?.model, logical_cpus: cpus().length, samples_per_case: samples, warmups_per_case: warmups, engine: "planner-v1 deterministic heuristic", network: "none; prepared synthetic directed matrices", nfr03_limit_ms: 3000, rows }, null, 2) + "\n");
  for (const row of rows.filter(row => row.stops <= 15)) expect(row.engine_p95_ms, `${row.stops} stops/${row.days} days`).toBeLessThanOrEqual(3000);
}, 60_000);
