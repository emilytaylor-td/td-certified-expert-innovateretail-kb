// netlify/functions/orders.js
const data = require('../../data/orders.json');

function unauthorized(headers) {
  return {
    statusCode: 401,
    headers: { 
      ...headers, 
      'WWW-Authenticate': 'Basic realm="TD-Cert Demo"'
    },
    body: JSON.stringify({ error: 'Unauthorized' })
  };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // ----- Basic Auth check -----
  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    return unauthorized(headers);
  }
  const creds = Buffer.from(auth.slice('Basic '.length), 'base64').toString('utf8');
  const sep = creds.indexOf(':');
  const user = creds.slice(0, sep);
  const pass = creds.slice(sep + 1);

  if (user !== process.env.BASIC_USER || pass !== process.env.BASIC_PASS) {
    return unauthorized(headers);
  }
  // ----------------------------

  const params = event.queryStringParameters || {};
  const { id, email, phone } = params;

  let results = data;
  if (id) results = results.filter(o => o.id === id);
  if (email) results = results.filter(o => o.email?.toLowerCase() === email.toLowerCase());
  if (phone) results = results.filter(o => o.phone === phone);

  const payload = results.length === 1 ? results[0] : results;
  return { statusCode: 200, headers, body: JSON.stringify(payload) };
};
