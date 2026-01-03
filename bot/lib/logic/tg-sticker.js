// bot/functions/tg-sticker.js
// Proxy Telegram sticker/file by file_id without exposing BOT_TOKEN to the client

const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN || '*';

function corsHeaders(origin) {
  const allow = origin || ALLOWED_TMA_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin'
  };
}

exports.handler = async (event) => {
  const headers = corsHeaders(event.headers.origin || event.headers.Origin);
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }
  if (!BOT_TOKEN) {
    return { statusCode: 500, headers, body: 'Server misconfigured' };
  }
  try {
    const qs = event.queryStringParameters || {};
    const fileId = qs.file_id;
    if (!fileId) {
      return { statusCode: 400, headers, body: 'Missing file_id' };
    }

    // Resolve file_path via getFile
    const gfUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const gfRes = await fetch(gfUrl);
    if (!gfRes.ok) {
      const txt = await gfRes.text().catch(()=> '');
      return { statusCode: 502, headers, body: `getFile failed: ${gfRes.status} ${txt}` };
    }
    const gfJson = await gfRes.json();
    if (!gfJson.ok || !gfJson.result?.file_path) {
      return { statusCode: 404, headers, body: 'file_path not found' };
    }
    const filePath = gfJson.result.file_path;
    const ext = (filePath.split('.').pop() || '').toLowerCase();
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    const fRes = await fetch(fileUrl);
    if (!fRes.ok) {
      const txt = await fRes.text().catch(()=> '');
      return { statusCode: 502, headers, body: `file download failed: ${fRes.status} ${txt}` };
    }
    const buf = await fRes.arrayBuffer();

    // Map content-type by extension
    let ct = 'application/octet-stream';
    if (ext === 'tgs') ct = 'application/x-tgsticker';
    else if (ext === 'webp') ct = 'image/webp';
    else if (ext === 'webm') ct = 'video/webm';

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400',
        'Content-Disposition': `inline; filename="${filePath.split('/').pop()}"`,
        'X-TG-File-Ext': ext
      },
      body: Buffer.from(buf).toString('base64'),
      isBase64Encoded: true
    };
  } catch (e) {
    return { statusCode: 500, headers, body: 'Internal error' };
  }
};
