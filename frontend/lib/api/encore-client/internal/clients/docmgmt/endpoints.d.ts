import { CallOpts } from "encore.dev/api";

type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;
type WithCallOpts<T extends (...args: any) => any> = (
  ...args: [...Parameters<T>, opts?: CallOpts]
) => ReturnType<T>;

import { getDocuments as getDocuments_handler } from "../../../../docmgmt/documents.js";
declare const getDocuments: WithCallOpts<typeof getDocuments_handler>;
export { getDocuments };

import { getDocument as getDocument_handler } from "../../../../docmgmt/documents.js";
declare const getDocument: WithCallOpts<typeof getDocument_handler>;
export { getDocument };

import { updateDocument as updateDocument_handler } from "../../../../docmgmt/documents.js";
declare const updateDocument: WithCallOpts<typeof updateDocument_handler>;
export { updateDocument };

import { deleteDocument as deleteDocument_handler } from "../../../../docmgmt/documents.js";
declare const deleteDocument: WithCallOpts<typeof deleteDocument_handler>;
export { deleteDocument };

import { getDocumentChunks as getDocumentChunks_handler } from "../../../../docmgmt/documents.js";
declare const getDocumentChunks: WithCallOpts<typeof getDocumentChunks_handler>;
export { getDocumentChunks };

import { getDocumentStats as getDocumentStats_handler } from "../../../../docmgmt/documents.js";
declare const getDocumentStats: WithCallOpts<typeof getDocumentStats_handler>;
export { getDocumentStats };

import { updateProcessingStatus as updateProcessingStatus_handler } from "../../../../docmgmt/documents.js";
declare const updateProcessingStatus: WithCallOpts<typeof updateProcessingStatus_handler>;
export { updateProcessingStatus };

import { createCollection as createCollection_handler } from "../../../../docmgmt/organization.js";
declare const createCollection: WithCallOpts<typeof createCollection_handler>;
export { createCollection };

import { getCollections as getCollections_handler } from "../../../../docmgmt/organization.js";
declare const getCollections: WithCallOpts<typeof getCollections_handler>;
export { getCollections };

import { getCollection as getCollection_handler } from "../../../../docmgmt/organization.js";
declare const getCollection: WithCallOpts<typeof getCollection_handler>;
export { getCollection };

import { updateCollection as updateCollection_handler } from "../../../../docmgmt/organization.js";
declare const updateCollection: WithCallOpts<typeof updateCollection_handler>;
export { updateCollection };

import { deleteCollection as deleteCollection_handler } from "../../../../docmgmt/organization.js";
declare const deleteCollection: WithCallOpts<typeof deleteCollection_handler>;
export { deleteCollection };

import { addDocumentToCollection as addDocumentToCollection_handler } from "../../../../docmgmt/organization.js";
declare const addDocumentToCollection: WithCallOpts<typeof addDocumentToCollection_handler>;
export { addDocumentToCollection };

import { removeDocumentFromCollection as removeDocumentFromCollection_handler } from "../../../../docmgmt/organization.js";
declare const removeDocumentFromCollection: WithCallOpts<typeof removeDocumentFromCollection_handler>;
export { removeDocumentFromCollection };

import { getCollectionDocuments as getCollectionDocuments_handler } from "../../../../docmgmt/organization.js";
declare const getCollectionDocuments: WithCallOpts<typeof getCollectionDocuments_handler>;
export { getCollectionDocuments };

import { getPopularTags as getPopularTags_handler } from "../../../../docmgmt/organization.js";
declare const getPopularTags: WithCallOpts<typeof getPopularTags_handler>;
export { getPopularTags };

import { addTagToDocument as addTagToDocument_handler } from "../../../../docmgmt/organization.js";
declare const addTagToDocument: WithCallOpts<typeof addTagToDocument_handler>;
export { addTagToDocument };

import { removeTagFromDocument as removeTagFromDocument_handler } from "../../../../docmgmt/organization.js";
declare const removeTagFromDocument: WithCallOpts<typeof removeTagFromDocument_handler>;
export { removeTagFromDocument };

import { getDocumentsByTag as getDocumentsByTag_handler } from "../../../../docmgmt/organization.js";
declare const getDocumentsByTag: WithCallOpts<typeof getDocumentsByTag_handler>;
export { getDocumentsByTag };

import { createSavedFilter as createSavedFilter_handler } from "../../../../docmgmt/organization.js";
declare const createSavedFilter: WithCallOpts<typeof createSavedFilter_handler>;
export { createSavedFilter };

import { getSavedFilters as getSavedFilters_handler } from "../../../../docmgmt/organization.js";
declare const getSavedFilters: WithCallOpts<typeof getSavedFilters_handler>;
export { getSavedFilters };

import { applySavedFilter as applySavedFilter_handler } from "../../../../docmgmt/organization.js";
declare const applySavedFilter: WithCallOpts<typeof applySavedFilter_handler>;
export { applySavedFilter };

import { getOrganizationRecommendations as getOrganizationRecommendations_handler } from "../../../../docmgmt/organization.js";
declare const getOrganizationRecommendations: WithCallOpts<typeof getOrganizationRecommendations_handler>;
export { getOrganizationRecommendations };


