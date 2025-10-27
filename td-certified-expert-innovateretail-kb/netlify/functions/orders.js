// netlify/functions/orders.js
const data = require('../../data/orders.json');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function unauthorized() {
  return {
    statusCode: 401,
    headers: { ...CORS_HEADERS, 'WWW-Authenticate': 'Basic realm="TD-Cert Demo"' },
    body: JSON.stringify({ error: 'Unauthorized' })
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  // ----- Basic Auth -----
  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth || !auth.startsWith('Basic ')) return unauthorized();
  const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':');
  if (user !== process.env.BASIC_USER || pass !== process.env.BASIC_PASS) return unauthorized();

  // ----- Query parsing -----
  const { id, email, phone } = event.queryStringParameters || {};
  if (!id && !email && !phone) {
    return json(400, {
      error: 'BadRequest',
      message: 'Provide one of: id, email, or phone',
      query: { id: id || null, email: email || null, phone: phone || null },
      count: 0,
      orders: []
    });
  }

  // ----- Filtering (id > email > phone) -----
  let results = data;
  if (id) {
    results = results.filter(o => o.id === id);
  } else if (email) {
    results = results.filter(o => (o.email || '').toLowerCase() === email.toLowerCase());
  } else if (phone) {
    results = results.filter(o => o.phone === phone);
  }

  const payload = {
    query: { id: id || null, email: email || null, phone: phone || null },
    count: results.length,
    orders: results.map(o => ({
      id: o.id,
      email: o.email || null,
      phone: o.phone || null,
      status: o.status || null,
      carrier: o.carrier || null,
      tracking: o.tracking || null,
      membershipTier: o.membershipTier || null,
      deliveryAddress: o.deliveryAddress ? {
        name: o.deliveryAddress.name || null,
        line1: o.deliveryAddress.line1 || null,
        line2: o.deliveryAddress.line2 || '',
        city: o.deliveryAddress.city || null,
        region: o.deliveryAddress.region || null,
        postal: o.deliveryAddress.postal || null,
        country: o.deliveryAddress.country || null
      } : null,
      items: Array.isArray(o.items) ? o.items.map(it => ({
        sku: it.sku || null,
        itemName: it.itemName || null,
        description: it.description || '',
        cost: typeof it.cost === 'number' ? it.cost : null,
        qty: typeof it.qty === 'number' ? it.qty : null
      })) : []
    }))
  };

  if (results.length === 0) {
    return json(404, { error: 'NotFound', message: 'No matching orders', ...payload });
  }

  return json(200, payload);
};
