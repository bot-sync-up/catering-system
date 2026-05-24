/**
 * המנוע המרכזי — מאחד extract/transform/load בלולאת ריצה אחת.
 *
 * אחראי על:
 *   - יצירת לקוחות Prisma + Pools.
 *   - לולאה על pipeline ה־extractors.
 *   - הפעלת ה־transformer (routeTransform).
 *   - הפעלת ה־loader (routeLoad).
 *   - דיווח התקדמות (cli-progress) ושמירת report.json.
 */

import cliProgress from "cli-progress";

import type { MigrationConfig, MigrationReport, TargetModel } from "./types.js";
import { buildExtractorPipeline } from "./extractors/index.js";
import { routeTransform } from "./transformers/index.js";
import { routeLoad } from "./loaders/index.js";
import { Reporter } from "./util/reporter.js";
import { getSourcePool, getTargetClient, closeAll } from "./util/prismaClient.js";
import { log } from "./util/logger.js";

export async function runMigration(config: MigrationConfig): Promise<MigrationReport> {
  const reporter = new Reporter(config);
  log.info(`מתחיל מיגרציה batch=${config.batchId} dryRun=${config.dryRun}`);

  if (!config.targetTenantId) {
    throw new Error("targetTenantId הוא שדה חובה — אין נתונים בלי דייר.");
  }

  // הקמת חיבורים.
  const prisma = await getTargetClient(config.targetDatabaseUrl);
  const pools: Record<string, unknown> = {};
  for (const [mod, url] of Object.entries(config.sourceDatabaseUrls)) {
    if (url) pools[mod] = await getSourcePool(mod, url);
  }

  const extractors = buildExtractorPipeline(pools as Parameters<typeof buildExtractorPipeline>[0]);
  if (extractors.length === 0) {
    log.warn("לא הוגדר אף מקור — מסיים בלי לעשות כלום.");
    await closeAll();
    return reporter.build();
  }

  // אם המשתמש ביקש מקור ספציפי — פילטר.
  const selected =
    config.source === "all"
      ? extractors
      : extractors.filter((e) => e.sourceModule === config.source);

  if (selected.length === 0) {
    throw new Error(`לא נמצא extractor למקור: ${config.source}`);
  }

  const multibar = new cliProgress.MultiBar(
    {
      format: "{name} [{bar}] {percentage}% | {value}/{total} | {model}",
      hideCursor: true,
      clearOnComplete: false,
      barCompleteChar: "█",
      barIncompleteChar: "░",
    },
    cliProgress.Presets.shades_classic,
  );

  for (const extractor of selected) {
    const model = extractor.targetModelHint as TargetModel;
    reporter.startModel(model);

    // אומדן ראשוני — נשתמש ב־limit אם יש, אחרת unknown.
    const bar = multibar.create(config.limit ?? 0, 0, {
      name: extractor.sourceTable.padEnd(14, " "),
      model,
    });

    try {
      for await (const rec of extractor.extract({
        batchId: config.batchId,
        limit: config.limit,
      })) {
        reporter.incExtracted(model);

        // Transform
        let transformed;
        try {
          transformed = routeTransform(rec, extractor.sourceTable, config.targetTenantId);
          reporter.incTransformed(model);
        } catch (err) {
          reporter.recordError({
            model,
            sourceModule: rec.__meta.sourceModule,
            originalId: rec.__meta.originalId,
            error: err instanceof Error ? err : new Error(String(err)),
          });
          if (!config.continueOnError) throw err;
          bar.increment();
          continue;
        }

        for (const w of transformed.warnings) {
          log.debug(`[${rec.__meta.sourceModule}::${rec.__meta.originalId}] ${w}`);
        }

        // Load
        const result = await routeLoad(transformed, { prisma, dryRun: config.dryRun });
        reporter.incLoaded(model, result);
        if (result.error) {
          reporter.recordError({
            model,
            sourceModule: rec.__meta.sourceModule,
            originalId: rec.__meta.originalId,
            error: result.error,
          });
          if (!config.continueOnError) {
            throw new Error(`load נכשל ל־${rec.__meta.originalId}: ${result.error}`);
          }
        }

        bar.increment();
      }
    } finally {
      reporter.endModel(model);
      bar.stop();
    }
  }

  multibar.stop();
  await closeAll();

  const report = reporter.build();
  log.info(
    `סיום: extracted=${report.totals.extracted} transformed=${report.totals.transformed} ` +
      `loaded=${report.totals.loaded} skipped=${report.totals.skipped} errors=${report.totals.errors}`,
  );
  return report;
}

export { Reporter };
