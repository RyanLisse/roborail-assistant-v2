import { CallOpts } from "encore.dev/api";

type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;
type WithCallOpts<T extends (...args: any) => any> = (
  ...args: [...Parameters<T>, opts?: CallOpts]
) => ReturnType<T>;

import { getMetrics as getMetrics_handler } from "../../../../lib/monitoring/encore.service.js";
declare const getMetrics: WithCallOpts<typeof getMetrics_handler>;
export { getMetrics };

import { healthCheck as healthCheck_handler } from "../../../../lib/monitoring/encore.service.js";
declare const healthCheck: WithCallOpts<typeof healthCheck_handler>;
export { healthCheck };

import { recordPerformance as recordPerformance_handler } from "../../../../lib/monitoring/encore.service.js";
declare const recordPerformance: WithCallOpts<typeof recordPerformance_handler>;
export { recordPerformance };

import { resetMetrics as resetMetrics_handler } from "../../../../lib/monitoring/encore.service.js";
declare const resetMetrics: WithCallOpts<typeof resetMetrics_handler>;
export { resetMetrics };

import { getCacheStats as getCacheStats_handler } from "../../../../lib/monitoring/encore.service.js";
declare const getCacheStats: WithCallOpts<typeof getCacheStats_handler>;
export { getCacheStats };

import { getSystemOverview as getSystemOverview_handler } from "../../../../lib/monitoring/encore.service.js";
declare const getSystemOverview: WithCallOpts<typeof getSystemOverview_handler>;
export { getSystemOverview };


