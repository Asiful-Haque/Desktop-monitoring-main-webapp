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




// for electron app
// import { NextResponse } from 'next/server';

// function withCors(response, origin) {
//   response.headers.set('Access-Control-Allow-Origin', origin);
//   response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   response.headers.set('Access-Control-Allow-Credentials', 'true'); // Important for cookies
//   return response;
// }

// /**
//  * Use this with your frontend origin, e.g., 'http://localhost:3000'
//  */
// export function corsJson(data, status = 200, origin) {
//   if (!origin) throw new Error('Origin must be specified when using credentials');
//   const response = NextResponse.json(data, { status });
//   return withCors(response, origin);
// }

// export function corsEmpty(status = 204, origin) {
//   if (!origin) throw new Error('Origin must be specified when using credentials');
//   const response = new NextResponse(null, { status });
//   return withCors(response, origin);
// }
