import { NextResponse } from 'next/server';

export function withCors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export function corsJson(data, status = 200) {
  const response = NextResponse.json(data, { status });
  return withCors(response);
}

export function corsEmpty(status = 204) {
  const response = new NextResponse(null, { status });
  return withCors(response);
}
