import { CallOpts } from "encore.dev/api";

type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;
type WithCallOpts<T extends (...args: any) => any> = (
  ...args: [...Parameters<T>, opts?: CallOpts]
) => ReturnType<T>;

import { processDocument as processDocument_handler } from "../../../../docprocessing/processing.js";
declare const processDocument: WithCallOpts<typeof processDocument_handler>;
export { processDocument };

import { getProcessingStatus as getProcessingStatus_handler } from "../../../../docprocessing/processing.js";
declare const getProcessingStatus: WithCallOpts<typeof getProcessingStatus_handler>;
export { getProcessingStatus };

import { reprocessDocument as reprocessDocument_handler } from "../../../../docprocessing/processing.js";
declare const reprocessDocument: WithCallOpts<typeof reprocessDocument_handler>;
export { reprocessDocument };


