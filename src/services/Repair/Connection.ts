// ./src/services/Repair/Connection.ts

import { NativeJSON } from './Json';
import { RepairRecipeParser } from './Recipe';

type ApiType = (typeof RepairConnection.TYPES)[number];

export interface RepairConnectionInput {
  apiType?: ApiType;
  apiUrl: string;
  model: string;
  apiKey: string;
}

export type ConnectionResult = 'success' | 'configuration' | 'unauthorized' | 'model' | 'context' | 'rateLimit' | 'server' | 'response' | 'truncated' | 'oversized' | 'timeout' | 'network';

interface ApiResponse {
  error?: { code?: unknown };
  data?: Array<{ id?: unknown }>;
  models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
  choices?: Array<{ finish_reason?: string; message?: { content?: unknown } }>;
  stop_reason?: string;
  content?: Array<{ type?: string; text?: unknown }>;
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: unknown; thought?: boolean }> } }>;
}

interface RepairMessage {
  role: 'system' | 'user';
  content: string;
}

export class RepairConnection {
  public static readonly TYPES = ['openai', 'anthropic', 'gemini'] as const;

  // 外层 JSON 会再次转义修复正文，并包含用量、推理等元数据。
  private static readonly ENVELOPE_LIMIT = RepairRecipeParser.MAX_LENGTH * 8;

  public static endpoint(apiUrl: string, apiType: ApiType = 'openai', model?: string): string {
    const url = new URL(apiUrl.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid API URL');
    url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/(chat\/completions|messages|models(?:\/[^/]+:generateContent)?)$/, '');
    const suffix = apiType === 'anthropic' ? '/messages' : apiType === 'gemini' ? `/models/${encodeURIComponent((model || '').replace(/^models\//, ''))}:generateContent` : '/chat/completions';
    url.pathname += suffix;
    return url.href;
  }

  private static async request(
    input: RepairConnectionInput,
    signal: AbortSignal,
    list: boolean,
    messages: RepairMessage[] = [{ role: 'user', content: 'Connection test. Reply briefly with OK.' }]
  ): Promise<{ result: ConnectionResult; data?: ApiResponse | null; reason?: string }> {
    let endpoint: string;
    const type = input.apiType || 'openai';
    try {
      if (!RepairConnection.TYPES.includes(type) || (!list && !input.model.trim()) || /[\r\n]/.test(input.apiKey)) return { result: 'configuration' };
      endpoint = RepairConnection.endpoint(input.apiUrl, type, input.model);
      if (list) endpoint = endpoint.replace(/\/(chat\/completions|messages|models\/[^/]*:generateContent)$/, '/models');
    } catch {
      return { result: 'configuration' };
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const key = input.apiKey.trim();
    if (key) headers[type === 'anthropic' ? 'x-api-key' : type === 'gemini' ? 'x-goog-api-key' : 'Authorization'] = type === 'openai' ? `Bearer ${key}` : key;
    if (type === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }
    const system = messages
      .filter(message => message.role === 'system')
      .map(message => message.content)
      .join('\n');
    const users = messages.filter(message => message.role === 'user');
    const body =
      type === 'gemini'
        ? { ...(system && { systemInstruction: { parts: [{ text: system }] } }), contents: users.map(message => ({ role: 'user', parts: [{ text: message.content }] })) }
        : {
            model: input.model.trim(),
            messages: type === 'anthropic' ? users : messages,
            ...(type === 'anthropic' ? { ...(system && { system }), max_tokens: system ? 8192 : 32 } : { stream: false })
          };
    try {
      const response = await fetch(endpoint, { method: list ? 'GET' : 'POST', headers, credentials: 'omit', redirect: 'error', signal, ...(!list && { body: NativeJSON.stringify(body) }) });
      if (response.status === 401 || response.status === 403) return { result: 'unauthorized' };
      if (response.status === 429) return { result: 'rateLimit' };
      if (response.status >= 500) return { result: 'server' };
      if (!response.ok && response.status !== 400) return { result: 'model' };
      try {
        const json = await response.text();
        if (json.length > RepairConnection.ENVELOPE_LIMIT) return { result: 'oversized' };
        const data = NativeJSON.parse(json) as ApiResponse | null;
        if (data?.error?.code === 'context_length_exceeded') return { result: 'context' };
        return response.ok ? { result: 'success', data } : { result: 'model' };
      } catch {
        if (signal.aborted) return { result: 'timeout' };
        return response.ok ? { result: 'response', reason: 'Invalid API JSON' } : { result: 'model' };
      }
    } catch {
      return { result: signal.aborted ? 'timeout' : 'network' };
    }
  }

  public static async complete(input: RepairConnectionInput, messages: RepairMessage[], signal: AbortSignal): Promise<{ result: ConnectionResult; content?: string; reason?: string }> {
    const { result, data, reason } = await RepairConnection.request(input, signal, false, messages);
    if (result !== 'success') return { result, ...(reason && { reason }) };
    const type = input.apiType || 'openai';
    const stop = type === 'anthropic' ? data?.stop_reason : type === 'gemini' ? data?.candidates?.[0]?.finishReason : data?.choices?.[0]?.finish_reason;
    if (['length', 'max_tokens', 'model_context_window_exceeded', 'MAX_TOKENS'].includes(stop || '')) return { result: 'truncated' };
    const content =
      type === 'anthropic'
        ? Array.isArray(data?.content)
          ? data.content
              .filter(part => part?.type === 'text' && typeof part.text === 'string')
              .map(part => part.text)
              .join('')
          : undefined
        : type === 'gemini'
          ? Array.isArray(data?.candidates?.[0]?.content?.parts)
            ? data.candidates[0]
                .content!.parts!.filter(part => !part?.thought && typeof part?.text === 'string')
                .map(part => part.text)
                .join('')
            : undefined
          : data?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.length > RepairRecipeParser.MAX_LENGTH) return { result: 'oversized' };
    return typeof content === 'string' && content.trim() ? { result: 'success', content } : { result: 'response', reason: 'API response contains no text' };
  }

  public static async test(input: RepairConnectionInput, signal: AbortSignal): Promise<ConnectionResult> {
    return (await RepairConnection.complete(input, [{ role: 'user', content: 'Connection test. Reply briefly with OK.' }], signal)).result;
  }

  public static async listModels(input: RepairConnectionInput, signal: AbortSignal): Promise<{ result: ConnectionResult; models: string[] }> {
    const { result, data } = await RepairConnection.request(input, signal, true);
    if (result !== 'success') return { result, models: [] };
    const entries =
      input.apiType === 'gemini'
        ? Array.isArray(data?.models)
          ? data.models
              .filter(item => typeof item?.name === 'string' && Array.isArray(item.supportedGenerationMethods) && item.supportedGenerationMethods.includes('generateContent'))
              .map(item => item.name!.replace(/^models\//, ''))
          : []
        : Array.isArray(data?.data)
          ? data.data.map(item => item?.id)
          : [];
    const models = [...new Set(entries.filter((id): id is string => typeof id === 'string' && !!id))].sort();
    return { result: models.length ? 'success' : 'response', models };
  }
}
