const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Cloud-Save-User',
  'Access-Control-Max-Age': '86400'
};

export function cloudResponse(body: BodyInit | null, init: ResponseInit = {}) {
  return new Response(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init.headers
    }
  });
}

export function optionsResponse() {
  return cloudResponse(null, { status: 204 });
}

export function unauthorizedResponse() {
  return cloudResponse('Unauthorized', { status: 401 });
}

export function textResponse(message: string, status = 200) {
  return cloudResponse(message, { status });
}

export function jsonResponse(value: unknown, status = 200) {
  return cloudResponse(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
