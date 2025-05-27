# Configuration and Secrets Management

This document outlines the strategy for managing environment-specific configurations and secrets within the `roborail-assistant` project, leveraging Encore's built-in capabilities.

## Guiding Principles

*   **No Hardcoded Secrets:** Sensitive information (API keys, credentials) MUST NOT be hardcoded in the source code or committed to version control.
*   **Environment-Specific Configurations:** Application behavior that needs to vary between environments (development, staging, production) should be managed through explicit configurations, not code changes.
*   **Centralized Management:** Utilize Encore's platform for managing both configurations and secrets where possible, providing a unified approach.

## Encore Secrets Management (`encore.dev/secrets`)

Encore provides a secure way to manage secrets. Secrets are defined in the code, but their values are injected at runtime by Encore based on the environment.

### Defining a Secret

```typescript
// Example: backend/docprocessing/processing.ts
import { secret } from "encore.dev/config"; // Or directly from encore.dev/secrets

const unstructuredApiKey = secret("UnstructuredApiKey", "API key for Unstructured.io service");
```

*   `secret("SecretName", "Description")`: Defines a secret. The `SecretName` is used to set its value.

### Accessing a Secret

```typescript
// Example: Using the unstructuredApiKey
const apiKey = unstructuredApiKey(); // Calling the secret variable retrieves its value
// Use apiKey in API calls...
```

### Setting Secret Values

*   **Local Development:**
    *   Use the Encore CLI: `encore secret set SecretName`
    *   Encore will prompt for the value. These are stored locally and not committed.
    *   For example, to set the `UnstructuredApiKey` locally:
        ```bash
        encore secret set UnstructuredApiKey
        ```
*   **Encore Cloud (Staging/Production):**
    *   Secrets are set securely through the Encore Cloud dashboard for each environment.
    *   Navigate to your app, then the specific environment, and find the Secrets section.

### Current Secrets

*   `UnstructuredApiKey`: API key for the Unstructured.io service, used in `backend/docprocessing/processing.ts`.

## Encore Configuration Management (`encore.dev/config`)

For non-sensitive, environment-specific settings (e.g., feature flags, LLM model names if they differ per environment, default parameters), Encore's configuration system can be used.

### Defining Configuration Structs

Configuration is typically defined in a struct within a service or a shared config package.

```typescript
// Example: backend/chat/config.ts (if specific to chat service)
import { config } from "encore.dev/config";

export const ChatServiceConfig = config.NewStruct("ChatServiceConfig", {
  DefaultLLMModel: config.String("default_llm_model") // Define field and its config key
    .Description("The default LLM model name to use for chat generation.")
    .Default("claude-3-opus-20240229"), // Provide a sensible default
  MaxFollowUpQuestions: config.Int("max_follow_up_questions")
    .Description("Maximum number of follow-up questions to generate.")
    .Default(3),
});
```

### Accessing Configuration Values

```typescript
// Example: In a chat service function
import { ChatServiceConfig } from "./config";

const llmModel = ChatServiceConfig().DefaultLLMModel;
const maxQuestions = ChatServiceConfig().MaxFollowUpQuestions;
// Use llmModel and maxQuestions ...
```

### Setting Configuration Values

*   **Local Development:**
    *   Values can be set in the `encore.app` file at the root of your project:
        ```yaml
        # encore.app
        # ... other app configs ...
        configs:
          ChatServiceConfig:
            default_llm_model: "local-debug-model"
            max_follow_up_questions: 2
        ```
    *   Or using the Encore CLI: `encore config set ChatServiceConfig.default_llm_model local-debug-model-cli`
*   **Encore Cloud (Staging/Production):**
    *   Configurations are managed through the Encore Cloud dashboard for each environment.

### Current Configurations

*   (As of now, no explicit custom configurations using `encore.dev/config` have been implemented. The above is an example of how they *would* be implemented if needed. Parameters like RAG `maxResults` are currently passed as arguments or are constants within functions.)

## `.env.example` File

An `.env.example` file should be maintained in the project root to guide developers on essential environment variables they might need to set up for their local Encore environment, especially for secrets managed by `encore secret set`.

Example `.env.example` content:

```
# Encore secrets to be set using 'encore secret set <SecretName>'
# These are NOT loaded automatically like a traditional .env file by Encore services.
# They serve as a reminder of what needs to be configured in the Encore environment.

# Required for document processing service
# Run: encore secret set UnstructuredApiKey
# UNSTRUCTURED_API_KEY="your_actual_api_key_here_for_reference_only_DO_NOT_COMMIT_ACTUAL_KEY"

# Add other secrets or important non-Encore environment variables if any
```

**Important:**
*   The actual `.env` file (containing real secret values for non-Encore managed local tools, if any) MUST be in `.gitignore`.
*   Encore services primarily consume secrets and configurations through Encore's own mechanisms, not directly from `.env` files loaded by the application code itself.

## Review and Evolution

This configuration and secrets management strategy will be reviewed and updated as the application evolves and new requirements for environment-specific behavior or sensitive data emerge. 