const { getCredFromCookies, parseJioCred, jio_sony_headers, cUrlGetData, setCorsHeaders } = require('./lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  try {
    const { ck, id, ts, link, data } = req.query;
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
    const headers = jio_sony_headers(ck, id, parsed.crm, parsed.device_id, parsed.access_token, parsed.uniqueId, parsed.ssoToken);
    let url;
    if (ts) {
      url = `https://jiotvmblive.cdn.jio.com/${ts}`;
    } else if (link) {
      url = decodeURIComponent(link);
    } else {
      res.status(400).json({ error: 'Missing ts or link parameter' });
      return;
    }
    const response = await cUrlGetData(url, headers);
    let contentType = 'video/mp2t';
    if (ts && ts.endsWith('.m3u8')) {
      contentType = 'application/vnd.apple.mpegurl';
    }
    if (contentType === 'application/vnd.apple.mpegurl') {
      let playlist = response;
      playlist = playlist.replace(/(https?:\/\/[^\s"']+\.ts)/g, (match) => {
        return `/cpsonyauth?ck=${encodeURIComponent(ck)}&id=${encodeURIComponent(id || '')}&ts=${encodeURIComponent(match)}`;
      });
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.status(200).send(playlist);
    } else {
      res.setHeader('Content-Type', contentType);
      res.status(200).send(response);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
