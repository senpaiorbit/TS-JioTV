const { getCredFromCookies, parseJioCred, jio_headers, jio_sony_headers, cUrlGetData, setCorsHeaders } = require('./_lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { ck, key, ts, id, link, data } = req.query;
    if (!ck) {
      return res.status(400).json({ error: 'Missing ck parameter' });
    }
    const cred = getCredFromCookies(req);
    if (!cred) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    const parsed = parseJioCred(cred);

    if (key) {
      const headers = jio_headers(null, parsed.access_token, parsed.crm, parsed.device_id, parsed.ssoToken, parsed.uniqueId);
      const url = `https://tv.media.jio.com/streams_live/${key}`;
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      const response = await cUrlGetData(url, headers);
      return res.status(200).send(response);
    }

    if (ts && !link) {
      const headers = jio_headers(null, parsed.access_token, parsed.crm, parsed.device_id, parsed.ssoToken, parsed.uniqueId);
      const url = `https://jiotvmblive.cdn.jio.com/${ts}`;
      res.setHeader('Content-Type', 'video/mp2t');
      const response = await cUrlGetData(url, headers);
      return res.status(200).send(response);
    }

    if (link || (ts && id)) {
      const headers = jio_sony_headers(ck, id, parsed.crm, parsed.device_id, parsed.access_token, parsed.uniqueId, parsed.ssoToken);
      let url;
      if (ts) {
        url = `https://jiotvmblive.cdn.jio.com/${ts}`;
      } else {
        url = decodeURIComponent(link);
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
        return res.status(200).send(playlist);
      }
      res.setHeader('Content-Type', contentType);
      return res.status(200).send(response);
    }

    return res.status(400).json({ error: 'Missing required parameters' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
