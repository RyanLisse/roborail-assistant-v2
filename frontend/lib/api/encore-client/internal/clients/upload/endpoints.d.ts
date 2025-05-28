import { CallOpts } from "encore.dev/api";

type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;
type WithCallOpts<T extends (...args: any) => any> = (
  ...args: [...Parameters<T>, opts?: CallOpts]
) => ReturnType<T>;

import { createProcessingStatus as createProcessingStatus_handler } from "../../../../upload/status.js";
declare const createProcessingStatus: WithCallOpts<typeof createProcessingStatus_handler>;
export { createProcessingStatus };

import { updateProcessingStatus as updateProcessingStatus_handler } from "../../../../upload/status.js";
declare const updateProcessingStatus: WithCallOpts<typeof updateProcessingStatus_handler>;
export { updateProcessingStatus };

import { getProcessingStatus as getProcessingStatus_handler } from "../../../../upload/status.js";
declare const getProcessingStatus: WithCallOpts<typeof getProcessingStatus_handler>;
export { getProcessingStatus };

import { queryProcessingStatuses as queryProcessingStatuses_handler } from "../../../../upload/status.js";
declare const queryProcessingStatuses: WithCallOpts<typeof queryProcessingStatuses_handler>;
export { queryProcessingStatuses };

import { retryProcessingFromStage as retryProcessingFromStage_handler } from "../../../../upload/status.js";
declare const retryProcessingFromStage: WithCallOpts<typeof retryProcessingFromStage_handler>;
export { retryProcessingFromStage };

import { cancelProcessing as cancelProcessing_handler } from "../../../../upload/status.js";
declare const cancelProcessing: WithCallOpts<typeof cancelProcessing_handler>;
export { cancelProcessing };

import { getProcessingMetrics as getProcessingMetrics_handler } from "../../../../upload/status.js";
declare const getProcessingMetrics: WithCallOpts<typeof getProcessingMetrics_handler>;
export { getProcessingMetrics };

import { uploadFile as uploadFile_handler } from "../../../../upload/upload.js";
declare const uploadFile: WithCallOpts<typeof uploadFile_handler>;
export { uploadFile };

import { getUploadStatus as getUploadStatus_handler } from "../../../../upload/upload.js";
declare const getUploadStatus: WithCallOpts<typeof getUploadStatus_handler>;
export { getUploadStatus };

import { downloadFile as downloadFile_handler } from "../../../../upload/upload.js";
declare const downloadFile: WithCallOpts<typeof downloadFile_handler>;
export { downloadFile };

import { deleteFile as deleteFile_handler } from "../../../../upload/upload.js";
declare const deleteFile: WithCallOpts<typeof deleteFile_handler>;
export { deleteFile };

import { fileExists as fileExists_handler } from "../../../../upload/upload.js";
declare const fileExists: WithCallOpts<typeof fileExists_handler>;
export { fileExists };

import { getFileMetadata as getFileMetadata_handler } from "../../../../upload/upload.js";
declare const getFileMetadata: WithCallOpts<typeof getFileMetadata_handler>;
export { getFileMetadata };


