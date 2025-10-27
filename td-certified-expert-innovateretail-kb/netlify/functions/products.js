// netlify/functions/products.js
const data = require('../../data/products.json');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const s = v => (v == null ? "" : String(v));
const b = v => (v === true || v === false ? v : null);
const n = v => (typeof v === "number" ? v : null);

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
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  // ----- Basic Auth -----
  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth || !auth.startsWith('Basic ')) return unauthorized();
  const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':');
  if (user !== process.env.BASIC_USER || pass !== process.env.BASIC_PASS) return unauthorized();

  // ----- Query params -----
  const qp = event.queryStringParameters || {};
  const rawSku = qp.sku ? String(qp.sku) : "";
  const q = qp.q ? String(qp.q).toLowerCase() : "";
  const inStockParam = typeof qp.inStock === 'string' ? qp.inStock.toLowerCase() : null;
  const minQty = qp.minQty ? parseInt(qp.minQty, 10) : null;

  // sku can be comma-separated
  const skuList = rawSku
    .split(',')
    .map(sku => sku.trim())
    .filter(Boolean);

  // ----- Filtering -----
  let results = data;

  if (skuList.length > 0) {
    const set = new Set(skuList);
    results = results.filter(p => set.has(p.sku));
  }

  if (q) {
    results = results.filter(p =>
      (p.itemName || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  }

  if (inStockParam === 'true' || inStockParam === 'false') {
    const want = inStockParam === 'true';
    results = results.filter(p => p.inStock === want);
  }

  if (Number.isInteger(minQty)) {
    results = results.filter(p => (p.availableQty || 0) >= minQty);
  }

  const payload = {
    count: results.length,
    products: results.map(p => ({
      sku: s(p.sku),
      itemName: s(p.itemName),
      description: s(p.description),
      price: n(p.price),
      inStock: b(p.inStock),
      availableQty: n(p.availableQty),
      restockDate: s(p.restockDate) // empty string if null
    }))
  };

  if (results.length === 0) {
    return json(404, { error: 'NotFound', message: 'No matching products', count: 0, products: [] });
  }

  return json(200, payload);
};
