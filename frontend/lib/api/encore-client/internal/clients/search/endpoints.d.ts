import { CallOpts } from "encore.dev/api";

type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;
type WithCallOpts<T extends (...args: any) => any> = (
  ...args: [...Parameters<T>, opts?: CallOpts]
) => ReturnType<T>;

import { hybridSearch as hybridSearch_handler } from "../../../../search/search.js";
declare const hybridSearch: WithCallOpts<typeof hybridSearch_handler>;
export { hybridSearch };

import { vectorSearch as vectorSearch_handler } from "../../../../search/search.js";
declare const vectorSearch: WithCallOpts<typeof vectorSearch_handler>;
export { vectorSearch };

import { fullTextSearch as fullTextSearch_handler } from "../../../../search/search.js";
declare const fullTextSearch: WithCallOpts<typeof fullTextSearch_handler>;
export { fullTextSearch };

import { enhancedSearch as enhancedSearch_handler } from "../../../../search/search.js";
declare const enhancedSearch: WithCallOpts<typeof enhancedSearch_handler>;
export { enhancedSearch };


