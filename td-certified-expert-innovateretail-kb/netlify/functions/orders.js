// netlify/functions/orders.js
const data = require('../../data/orders.json');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const { id, email, phone } = params;

  let results = data;
  if (id) results = results.filter(o => o.id === id);
  if (email) results = results.filter(o => o.email?.toLowerCase() === email.toLowerCase());
  if (phone) results = results.filter(o => o.phone === phone);

  const payload = results.length === 1 ? results[0] : results;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(payload)
  };
};
