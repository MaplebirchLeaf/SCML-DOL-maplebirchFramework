const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, PUT, DELETE, MKCOL',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
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
  return cloudResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Cloud Save"'
    }
  });
}

export function textResponse(message: string, status = 200) {
  return cloudResponse(message, { status });
}
