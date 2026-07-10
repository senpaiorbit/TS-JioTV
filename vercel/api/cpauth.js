const { getCredFromCookies, parseJioCred, jio_headers, cUrlGetData, setCorsHeaders } = require('./_lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  try {
    const { ck, key, ts } = req.query;
    if (!ck) {
      res.status(400).json({ error: 'Missing ck parameter' });
      return;
    }
    const cred = getCredFromCookies(req);
    if (!cred) {
      res.status(401).json({ error: 'Not logged in' });
      return;
    }
    const parsed = parseJioCred(cred);
    const headers = jio_headers(null, parsed.access_token, parsed.crm, parsed.device_id, parsed.ssoToken, parsed.uniqueId);
    let url;
    if (key) {
      url = `https://tv.media.jio.com/streams_live/${key}`;
    } else if (ts) {
      url = `https://jiotvmblive.cdn.jio.com/${ts}`;
    } else {
      res.status(400).json({ error: 'Missing key or ts parameter' });
      return;
    }
    const response = await cUrlGetData(url, headers);
    if (key) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else {
      res.setHeader('Content-Type', 'video/mp2t');
    }
    res.status(200).send(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
