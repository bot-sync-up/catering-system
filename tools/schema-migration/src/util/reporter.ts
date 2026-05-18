/**
 * Reporter שמרכז סטטיסטיקה לאורך הריצה ושומר report.json בסוף.
 */
import { promises as fs } from "fs";
import path from "path";

import type { LoadResult, MigrationConfig, MigrationReport, TargetModel } from "../types.js";

type PerModelStats = MigrationReport["perModel"][string];

export class Reporter {
  private readonly startedAt = new Date();
  private readonly perModel = new Map<TargetModel, PerModelStats>();
  private readonly errors: MigrationReport["errors"] = [];
  private readonly modelStartTimes = new Map<TargetModel, number>();

  constructor(private readonly config: MigrationConfig) {}

  startModel(model: TargetModel): void {
    this.modelStartTimes.set(model, Date.now());
    if (!this.perModel.has(model)) {
      this.perModel.set(model, {
        extracted: 0,
        transformed: 0,
        loaded: 0,
        skipped: 0,
        errors: 0,
        durationMs: 0,
      });
    }
  }

  incExtracted(model: TargetModel, n = 1): void {
    this.ensure(model).extracted += n;
  }

  incTransformed(model: TargetModel, n = 1): void {
    this.ensure(model).transformed += n;
  }

  incLoaded(model: TargetModel, result: LoadResult): void {
    const stats = this.ensure(model);
    if (result.action === "skipped") stats.skipped += 1;
    else stats.loaded += 1;
  }

  recordError(args: {
    model: TargetModel;
    sourceModule: string;
    originalId: string;
    error: Error | string;
  }): void {
    this.ensure(args.model).errors += 1;
    const err = args.error instanceof Error ? args.error : new Error(String(args.error));
    this.errors.push({
      sourceModule: args.sourceModule,
      originalId: args.originalId,
      targetModel: args.model,
      message: err.message,
      stack: err.stack,
    });
  }

  endModel(model: TargetModel): void {
    const start = this.modelStartTimes.get(model);
    if (start !== undefined) this.ensure(model).durationMs = Date.now() - start;
  }

  build(): MigrationReport {
    const perModel: MigrationReport["perModel"] = {};
    let totalExtracted = 0;
    let totalTransformed = 0;
    let totalLoaded = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    for (const [model, stats] of this.perModel) {
      perModel[model] = stats;
      totalExtracted += stats.extracted;
      totalTransformed += stats.transformed;
      totalLoaded += stats.loaded;
      totalSkipped += stats.skipped;
      totalErrors += stats.errors;
    }
    const { targetDatabaseUrl: _t, sourceDatabaseUrls: _s, ...safeCfg } = this.config;
    return {
      batchId: this.config.batchId,
      startedAt: this.startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      config: safeCfg,
      perModel,
      errors: this.errors,
      totals: {
        extracted: totalExtracted,
        transformed: totalTransformed,
        loaded: totalLoaded,
        skipped: totalSkipped,
        errors: totalErrors,
      },
    };
  }

  async writeToFile(filepath: string): Promise<void> {
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(this.build(), null, 2), "utf-8");
  }

  private ensure(model: TargetModel): PerModelStats {
    let stats = this.perModel.get(model);
    if (!stats) {
      stats = { extracted: 0, transformed: 0, loaded: 0, skipped: 0, errors: 0, durationMs: 0 };
      this.perModel.set(model, stats);
    }
    return stats;
  }
}
