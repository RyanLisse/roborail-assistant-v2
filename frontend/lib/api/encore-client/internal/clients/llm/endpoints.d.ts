import { CallOpts } from "encore.dev/api";

type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;
type WithCallOpts<T extends (...args: any) => any> = (
  ...args: [...Parameters<T>, opts?: CallOpts]
) => ReturnType<T>;

import { parseCitations as parseCitations_handler } from "../../../../llm/citations.js";
declare const parseCitations: WithCallOpts<typeof parseCitations_handler>;
export { parseCitations };

import { validateCitationsEndpoint as validateCitationsEndpoint_handler } from "../../../../llm/citations.js";
declare const validateCitationsEndpoint: WithCallOpts<typeof validateCitationsEndpoint_handler>;
export { validateCitationsEndpoint };

import { generateFollowUp as generateFollowUp_handler } from "../../../../llm/citations.js";
declare const generateFollowUp: WithCallOpts<typeof generateFollowUp_handler>;
export { generateFollowUp };

import { formatCitations as formatCitations_handler } from "../../../../llm/citations.js";
declare const formatCitations: WithCallOpts<typeof formatCitations_handler>;
export { formatCitations };

import { extractCitedContent as extractCitedContent_handler } from "../../../../llm/citations.js";
declare const extractCitedContent: WithCallOpts<typeof extractCitedContent_handler>;
export { extractCitedContent };

import { generate as generate_handler } from "../../../../llm/llm.js";
declare const generate: WithCallOpts<typeof generate_handler>;
export { generate };

import { generateRAG as generateRAG_handler } from "../../../../llm/llm.js";
declare const generateRAG: WithCallOpts<typeof generateRAG_handler>;
export { generateRAG };

import { health as health_handler } from "../../../../llm/llm.js";
declare const health: WithCallOpts<typeof health_handler>;
export { health };

import { buildPrompt as buildPrompt_handler } from "../../../../llm/prompts.js";
declare const buildPrompt: WithCallOpts<typeof buildPrompt_handler>;
export { buildPrompt };

import { listTemplates as listTemplates_handler } from "../../../../llm/prompts.js";
declare const listTemplates: WithCallOpts<typeof listTemplates_handler>;
export { listTemplates };

import { getTemplate as getTemplate_handler } from "../../../../llm/prompts.js";
declare const getTemplate: WithCallOpts<typeof getTemplate_handler>;
export { getTemplate };

import { addTemplate as addTemplate_handler } from "../../../../llm/prompts.js";
declare const addTemplate: WithCallOpts<typeof addTemplate_handler>;
export { addTemplate };

import { removeTemplate as removeTemplate_handler } from "../../../../llm/prompts.js";
declare const removeTemplate: WithCallOpts<typeof removeTemplate_handler>;
export { removeTemplate };

import { validateTemplateEndpoint as validateTemplateEndpoint_handler } from "../../../../llm/prompts.js";
declare const validateTemplateEndpoint: WithCallOpts<typeof validateTemplateEndpoint_handler>;
export { validateTemplateEndpoint };


