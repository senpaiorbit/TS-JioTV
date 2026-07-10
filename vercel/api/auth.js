const { getCredFromCookies, parseJioCred, jio_headers, cUrlGetData, setCorsHeaders } = require('./_lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const cred = getCredFromCookies(req);
  if (!cred) return res.status(401).send('Invalid credentials');

  const { ssoToken, access_token, crm, uniqueId, device_id } = parseJioCred(cred);
  const ck = req.query.ck;
  if (!ck) return res.status(400).send('Missing authentication token');

  const cookies = Buffer.from(ck, 'hex').toString('utf8');
  const headers = jio_headers(cookies, access_token, crm, device_id, ssoToken, uniqueId);

  try {
    if (req.query.key) {
      const url = `https://tv.media.jio.com/streams_live/${encodeURIComponent(req.query.key)}`;
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      const data = await cUrlGetData(url, headers);
      return res.status(200).send(data || 'Error fetching content');
    }

    if (req.query.pkey) {
      const url = `https://tv.media.jio.com/fallback/bpk-tv/${encodeURIComponent(req.query.pkey)}`;
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      const data = await cUrlGetData(url, headers);
      return res.status(200).send(data || 'Error fetching content');
    }

    if (req.query.ts) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Connection', 'keep-alive');
      const data = await cUrlGetData(`https://jiotvmblive.cdn.jio.com/${req.query.ts}`, {
        ...headers,
        'Connection': 'keep-alive',
      });
      return res.status(200).send(data || 'Error fetching content');
    }

    return res.status(400).send('Invalid request parameters');
  } catch (e) {
    return res.status(500).send('Error: ' + e.message);
  }
};
