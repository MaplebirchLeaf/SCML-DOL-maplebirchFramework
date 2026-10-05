import { expect, spyOn, test } from 'bun:test';
import { RepairConnection } from '../../src/services/Repair/Connection';
import { RepairRecipeParser } from '../../src/services/Repair/Recipe';

test('accepts base URLs and complete endpoints, rejects embedded credentials', () => {
  expect(RepairConnection.endpoint('https://example.com/v1/')).toBe('https://example.com/v1/chat/completions');
  expect(RepairConnection.endpoint('http://localhost:8080/v1/chat/completions')).toBe('http://localhost:8080/v1/chat/completions');
  for (const url of ['javascript:alert(1)', 'https://key@example.com/v1', 'https://example.com/v1?key=secret', 'https://example.com/v1#fragment'])
    expect(() => RepairConnection.endpoint(url)).toThrow();
});

test('validates a chat response without sending game data or following redirects', async () => {
  const requests: Request[] = [];
  const server = Bun.serve({
    port: 0,
    fetch: async request => {
      requests.push(request);
      const body = await request.json();
      expect(body).toEqual({ model: 'test-model', messages: [{ role: 'user', content: 'Connection test. Reply briefly with OK.' }], stream: false });
      expect(request.headers.get('Authorization')).toBe('Bearer test-key');
      return Response.json({ choices: [{ message: { content: 'OK' } }] });
    }
  });
  try {
    expect(await RepairConnection.test({ apiUrl: server.url.href, apiKey: 'test-key', model: 'test-model' }, new AbortController().signal)).toBe('success');
    expect(requests.length).toBe(1);
  } finally {
    server.stop(true);
  }
});

test('reports HTTP failures and malformed responses without exposing server text', async () => {
  let reply = new Response('private server detail', { status: 401 });
  const server = Bun.serve({ port: 0, fetch: () => reply });
  const input = { apiUrl: server.url.href, apiKey: '', model: 'test-model' };
  try {
    for (const [status, result] of [
      [401, 'unauthorized'],
      [403, 'unauthorized'],
      [429, 'rateLimit'],
      [500, 'server'],
      [404, 'model']
    ] as const) {
      reply = new Response('private server detail', { status });
      expect(await RepairConnection.test(input, new AbortController().signal)).toBe(result);
    }
    for (const data of [null, {}, { choices: [{ message: { content: '' } }] }]) {
      reply = Response.json(data);
      expect(await RepairConnection.test(input, new AbortController().signal)).toBe('response');
    }
    reply = new Response('not JSON');
    expect(await RepairConnection.test(input, new AbortController().signal)).toBe('response');
    reply = new Response(null, { status: 302, headers: { Location: '/other' } });
    expect(await RepairConnection.test(input, new AbortController().signal)).toBe('network');
    const controller = new AbortController();
    controller.abort();
    expect(await RepairConnection.test(input, controller.signal)).toBe('timeout');
  } finally {
    server.stop(true);
  }
});

test('uses provider endpoints, authentication and model responses', async () => {
  let type: 'openai' | 'anthropic' | 'gemini' = 'openai';
  const server = Bun.serve({
    port: 0,
    fetch: async request => {
      const path = new URL(request.url).pathname;
      expect(request.headers.get(type === 'openai' ? 'Authorization' : type === 'anthropic' ? 'x-api-key' : 'x-goog-api-key')).toBe(type === 'openai' ? 'Bearer test-key' : 'test-key');
      if (request.method === 'GET') {
        expect(path).toBe('/v1/models');
        return Response.json(
          type === 'gemini'
            ? {
                models: [
                  { name: 123, supportedGenerationMethods: ['generateContent'] },
                  { name: 'models/test-model', supportedGenerationMethods: ['generateContent'] },
                  { name: 'models/embedding', supportedGenerationMethods: ['embedContent'] }
                ]
              }
            : { data: [{ id: 'test-model' }, { id: 'test-model' }] }
        );
      }
      const body = await request.json();
      expect(path).toBe(type === 'openai' ? '/v1/chat/completions' : type === 'anthropic' ? '/v1/messages' : '/v1/models/test-model:generateContent');
      if (type === 'anthropic') {
        expect(request.headers.get('anthropic-version')).toBe('2023-06-01');
        expect(body.max_tokens).toBe(32);
      }
      if (type === 'gemini') expect(body.contents[0].parts[0].text).toBe('Connection test. Reply briefly with OK.');
      return Response.json(
        type === 'openai'
          ? { choices: [{ message: { content: 'OK' } }] }
          : type === 'anthropic'
            ? { content: [{ type: 'text', text: 'OK' }] }
            : { candidates: [{ content: { parts: [{ text: 'OK' }] } }] }
      );
    }
  });
  try {
    for (type of ['openai', 'anthropic', 'gemini'] as const) {
      const input = { apiType: type, apiUrl: new URL('/v1', server.url).href, apiKey: 'test-key', model: 'test-model' };
      expect(await RepairConnection.listModels({ ...input, model: '' }, new AbortController().signal)).toEqual({ result: 'success', models: ['test-model'] });
      expect(await RepairConnection.listModels(input, new AbortController().signal)).toEqual({ result: 'success', models: ['test-model'] });
      expect(await RepairConnection.test(input, new AbortController().signal)).toBe('success');
    }
  } finally {
    server.stop(true);
  }
});

test('sends repair instructions and diagnostics to each selected API', async () => {
  const messages = [
    { role: 'system' as const, content: 'Return repair JSON.' },
    { role: 'user' as const, content: JSON.stringify({ diagnostics: [{ message: 'Missing anchor' }] }) }
  ];
  let type: 'openai' | 'anthropic' | 'gemini' = 'openai';
  const reply = '{"outcome":"insufficient-context"}';
  const server = Bun.serve({
    port: 0,
    fetch: async request => {
      const body = await request.json();
      if (type === 'openai') expect(body.messages).toEqual(messages);
      if (type === 'anthropic') {
        expect(body.system).toBe(messages[0].content);
        expect(body.messages).toEqual([messages[1]]);
        expect(body.max_tokens).toBe(8192);
      }
      if (type === 'gemini') {
        expect(body.systemInstruction.parts[0].text).toBe(messages[0].content);
        expect(body.contents[0].parts[0].text).toBe(messages[1].content);
      }
      return Response.json(
        type === 'openai'
          ? { choices: [{ message: { content: reply } }] }
          : type === 'anthropic'
            ? { content: [{ type: 'text', text: reply }] }
            : { candidates: [{ content: { parts: [{ text: reply }] } }] }
      );
    }
  });
  try {
    for (type of ['openai', 'anthropic', 'gemini'] as const)
      expect(await RepairConnection.complete({ apiType: type, apiUrl: server.url.href, apiKey: '', model: 'test' }, messages, new AbortController().signal)).toEqual({
        result: 'success',
        content: reply
      });
  } finally {
    server.stop(true);
  }
});

test('reports provider output truncation before accepting partial or complete text', async () => {
  const fetch = spyOn(globalThis, 'fetch');
  const messages = [{ role: 'user' as const, content: 'Repair JSON.' }];
  const signal = new AbortController().signal;
  try {
    for (const [apiType, response] of [
      ['openai', { choices: [{ finish_reason: 'length', message: { content: '{}' } }] }],
      ['anthropic', { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{' }] }],
      ['anthropic', { stop_reason: 'model_context_window_exceeded', content: [{ type: 'text', text: '{}' }] }],
      ['gemini', { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }]
    ] as const) {
      fetch.mockResolvedValueOnce(Response.json(response));
      const input = { apiType, apiUrl: 'https://example.test/v1', apiKey: '', model: 'model' };
      expect(await RepairConnection.complete(input, messages, signal)).toEqual({ result: 'truncated' });
    }
    expect(fetch).toHaveBeenCalledTimes(4);
  } finally {
    fetch.mockRestore();
  }
});

test('joins provider text parts without including reasoning or another candidate', async () => {
  const fetch = spyOn(globalThis, 'fetch');
  const messages = [{ role: 'user' as const, content: 'Repair JSON.' }];
  const signal = new AbortController().signal;
  const content = '{"operations":[]}';
  try {
    for (const [apiType, response] of [
      [
        'anthropic',
        {
          stop_reason: 'end_turn',
          content: [
            { type: 'thinking', text: 'private reasoning' },
            { type: 'text', text: '{"operations":' },
            { type: 'text', text: 123 },
            { type: 'text', text: '[]}' }
          ]
        }
      ],
      [
        'gemini',
        {
          candidates: [
            { finishReason: 'STOP', content: { parts: [{ thought: true, text: 'private reasoning' }, { text: '{"operations":' }, { text: 123 }, { text: '[]}' }] } },
            { finishReason: 'STOP', content: { parts: [{ text: 'unselected candidate' }] } }
          ]
        }
      ]
    ] as const) {
      fetch.mockResolvedValueOnce(Response.json(response));
      const input = { apiType, apiUrl: 'https://example.test/v1', apiKey: '', model: 'model' };
      expect(await RepairConnection.complete(input, messages, signal)).toEqual({ result: 'success', content });
    }
  } finally {
    fetch.mockRestore();
  }
});

test('accepts valid response text when envelope escaping exceeds the former envelope limit', async () => {
  const fetch = spyOn(globalThis, 'fetch');
  const content = JSON.stringify({ text: '\u0001'.repeat(38000) });
  const envelope = JSON.stringify({ choices: [{ message: { content } }] });
  expect(content.length).toBeLessThan(256000);
  expect(envelope.length).toBeGreaterThan(256000);
  try {
    fetch.mockResolvedValueOnce(new Response(envelope));
    expect(await RepairConnection.complete({ apiUrl: 'https://example.test/v1', apiKey: '', model: 'model' }, [], new AbortController().signal)).toEqual({ result: 'success', content });
    expect(() => JSON.parse(content)).not.toThrow();
  } finally {
    fetch.mockRestore();
  }
});

test('enforces separate text and envelope limits without returning oversized content', async () => {
  const fetch = spyOn(globalThis, 'fetch');
  const input = { apiUrl: 'https://example.test/v1', apiKey: '', model: 'model' };
  const signal = new AbortController().signal;
  try {
    const content = 'a'.repeat(RepairRecipeParser.MAX_LENGTH);
    fetch.mockResolvedValueOnce(Response.json({ choices: [{ message: { content } }] }));
    expect(await RepairConnection.complete(input, [], signal)).toEqual({ result: 'success', content });
    fetch.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: content + 'a' } }] }));
    expect(await RepairConnection.complete(input, [], signal)).toEqual({ result: 'oversized' });
    fetch.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: '{}' } }], metadata: 'a'.repeat(RepairRecipeParser.MAX_LENGTH * 8) }));
    expect(await RepairConnection.complete(input, [], signal)).toEqual({ result: 'oversized' });
  } finally {
    fetch.mockRestore();
  }
});

test('classifies malformed envelopes and missing text without exposing response content', async () => {
  const fetch = spyOn(globalThis, 'fetch');
  const input = { apiUrl: 'https://example.test/v1', apiKey: '', model: 'model' };
  const signal = new AbortController().signal;
  try {
    fetch.mockResolvedValueOnce(new Response('private server detail'));
    expect(await RepairConnection.complete(input, [], signal)).toEqual({ result: 'response', reason: 'Invalid API JSON' });
    fetch.mockResolvedValueOnce(Response.json({ choices: [{ message: { reasoning_content: 'private reasoning' } }] }));
    expect(await RepairConnection.complete(input, [], signal)).toEqual({ result: 'response', reason: 'API response contains no text' });
  } finally {
    fetch.mockRestore();
  }
});

test('recognizes context limits without exposing provider error text', async () => {
  const fetch = spyOn(globalThis, 'fetch');
  const input = { apiUrl: 'https://example.test/v1', apiKey: '', model: 'model' };
  const signal = new AbortController().signal;
  try {
    for (const status of [400, 200]) {
      fetch.mockResolvedValueOnce(Response.json({ error: { code: 'context_length_exceeded', message: 'private server detail' } }, { status }));
      expect(await RepairConnection.complete(input, [], signal)).toEqual({ result: 'context' });
    }
    fetch.mockResolvedValueOnce(new Response('private server detail', { status: 400 }));
    expect(await RepairConnection.complete(input, [], signal)).toEqual({ result: 'model' });
  } finally {
    fetch.mockRestore();
  }
});
