/**
 * LLM Data Access Layer
 * Encapsulates LLM provider SDK usage - no domain logic, no persistence
 * Supports Azure OpenAI and OpenAI providers via LLM_PROVIDER environment variable
 */

import dotenv from 'dotenv';

dotenv.config();

export interface SuggestTagsContext {
  title?: string;
  tags?: string[];
  medium?: string;
  classification?: string;
}

type LLMProvider = 'azure' | 'openai';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let azureClient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let openaiClient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AzureOpenAIClientClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let OpenAIClientClass: any = null;

function getProvider(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER || 'azure').toLowerCase();
  if (provider !== 'azure' && provider !== 'openai') {
    throw new Error(`Invalid LLM_PROVIDER: ${provider}. Must be "azure" or "openai"`);
  }
  return provider as LLMProvider;
}

async function getAzureClient(): Promise<any> {
  if (azureClient === null) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT;
    
    if (!endpoint || !apiKey || !deploymentName) {
      throw new Error('Missing Azure OpenAI configuration. Required: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY (or AZURE_OPENAI_KEY), AZURE_OPENAI_DEPLOYMENT_NAME (or AZURE_OPENAI_DEPLOYMENT)');
    }
    
    if (!AzureOpenAIClientClass) {
      try {
        const openaiModule = await import('openai');
        if (openaiModule.AzureOpenAI) {
          AzureOpenAIClientClass = openaiModule.AzureOpenAI;
          azureClient = new AzureOpenAIClientClass({
            endpoint,
            apiKey,
            deployment: deploymentName,
            apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-06-01'
          });
        } else {
          throw new Error('AzureOpenAI not found in openai package');
        }
      } catch (error) {
        throw new Error(`Failed to initialize Azure OpenAI client. Please ensure the "openai" package is installed: npm install openai. Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return azureClient;
}

async function getOpenAIClient(): Promise<any> {
  if (openaiClient === null) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Missing OpenAI configuration. Required: OPENAI_API_KEY');
    }
    
    if (!OpenAIClientClass) {
      try {
        const openaiModule = await import('openai');
        // Try default export first, then named export
        if (openaiModule.default) {
          OpenAIClientClass = openaiModule.default;
        } else if (openaiModule.OpenAI) {
          OpenAIClientClass = openaiModule.OpenAI;
        } else {
          throw new Error('OpenAI client not found in openai package');
        }
        openaiClient = new OpenAIClientClass({
          apiKey
        });
      } catch (error) {
        throw new Error(`Failed to initialize OpenAI client. Please ensure the "openai" package is installed: npm install openai. Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return openaiClient;
}

/**
 * Suggest descriptive tags for an artwork from its normalized metadata (text-only; no image in v1).
 * Returns suggested tags only; does not persist.
 */
export async function suggestTagsForArtwork(context: SuggestTagsContext): Promise<{ tags: string[] }> {
  const provider = getProvider();
  const title = context.title ?? '';
  const existingTags = Array.isArray(context.tags) ? context.tags.join(', ') : '';
  const medium = context.medium ?? '';
  const classification = context.classification ?? '';

  const userPrompt = `Suggest 3 to 10 short, descriptive tags for this artwork. Only respond with a JSON object: { "tags": ["tag1", "tag2", ...] }. No other text.

Title: ${title}
Existing tags: ${existingTags || '(none)'}
Medium: ${medium || '(unknown)'}
Classification: ${classification || '(unknown)'}`;

  const systemContent = 'You suggest descriptive tags for museum artworks. Respond with valid JSON only: { "tags": ["string", ...] }.'

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any;

    if (provider === 'azure') {
      const azureClient = await getAzureClient();
      const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT;
      if (!deploymentName) {
        throw new Error('Missing Azure OpenAI deployment name.');
      }
      if (azureClient.chat && azureClient.chat.completions) {
        response = await azureClient.chat.completions.create({
          model: deploymentName,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userPrompt },
          ],
        });
      } else if (azureClient.getChatCompletions) {
        response = await azureClient.getChatCompletions(deploymentName, [
          { role: 'system', content: systemContent },
          { role: 'user', content: userPrompt },
        ]);
      } else {
        throw new Error('Unknown Azure OpenAI client type');
      }
    } else {
      const openaiClient = await getOpenAIClient();
      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      response = await openaiClient.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userPrompt },
        ],
      });
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      const providerName = provider === 'azure' ? 'Azure OpenAI' : 'OpenAI';
      throw new Error(`No response from ${providerName}`);
    }

    const parsed = JSON.parse(content) as { tags?: unknown };
    if (!Array.isArray(parsed.tags)) {
      throw new Error('LLM response missing or invalid "tags" array');
    }
    const tags = parsed.tags.filter((t): t is string => typeof t === 'string');
    return { tags };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse LLM response: ${error.message}`);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Tag suggestion failed: ${errorMessage}`);
  }
}
