/**
 * LLM helper – uses the official OpenAI SDK.
 * Compatible with any OpenAI-compatible endpoint (OpenAI, Azure, Ollama, etc.)
 * Set OPENAI_API_KEY, OPENAI_BASE_URL, and OPENAI_MODEL in your .env file.
 */
import OpenAI from "openai";
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type MessageContent = string | TextContent | ImageContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: "none" | "auto" | "required";
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  maxTokens?: number;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

function getClient(): OpenAI {
  if (!ENV.openAiApiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it in your .env file."
    );
  }
  return new OpenAI({
    apiKey: ENV.openAiApiKey,
    baseURL: ENV.openAiBaseUrl,
  });
}

function normalizeMessages(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
  return messages.map((msg) => {
    const content = msg.content;
    if (typeof content === "string") {
      return { role: msg.role as any, content };
    }
    if (Array.isArray(content)) {
      const parts = content.map((part) => {
        if (typeof part === "string") return { type: "text" as const, text: part };
        if (part.type === "text") return part;
        if (part.type === "image_url") return part;
        return { type: "text" as const, text: JSON.stringify(part) };
      });
      return { role: msg.role as any, content: parts as any };
    }
    return { role: msg.role as any, content: JSON.stringify(content) };
  });
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getClient();
  const { messages, tools, toolChoice, responseFormat, response_format, maxTokens } = params;
  const fmt = responseFormat || response_format;

  const completion = await client.chat.completions.create({
    model: ENV.openAiModel,
    messages: normalizeMessages(messages),
    ...(tools && tools.length > 0 ? { tools: tools as any } : {}),
    ...(toolChoice ? { tool_choice: toolChoice as any } : {}),
    ...(fmt ? { response_format: fmt as any } : {}),
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  });

  return completion as unknown as InvokeResult;
}
