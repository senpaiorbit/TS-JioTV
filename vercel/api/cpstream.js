const { getCredFromCookies, parseJioCred, jio_headers, cUrlGetData, setCorsHeaders } = require('./lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  try {
    const { cid, id, ck, srno, begin, end } = req.query;
    if (!cid || !id || !ck || !srno || !begin || !end) {
      res.status(400).json({ error: 'Missing required query params' });
      return;
    }
    const cred = getCredFromCookies(req);
    if (!cred) {
      res.status(401).json({ error: 'Not logged in' });
      return;
    }
    const parsed = parseJioCred(cred);
    const headers = jio_headers(null, parsed.access_token, parsed.crm, parsed.device_id, parsed.ssoToken, parsed.uniqueId);
    const url = `https://api.media.jio.com/playback/v3/play?contentId=${id}&srno=${srno}&startTime=${begin}&endTime=${end}`;
    const response = await cUrlGetData(url, headers);
    const data = JSON.parse(response);
    if (!data || !data.hlsStreamingUrl) {
      res.status(404).json({ error: 'No playback URL found' });
      return;
    }
    let playlist = await cUrlGetData(data.hlsStreamingUrl, headers);
    playlist = playlist.replace(/(https?:\/\/[^\s"']+\.ts)/g, (match) => {
      return `/cpauth?ck=${encodeURIComponent(ck)}&ts=${encodeURIComponent(match)}`;
    });
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.status(200).send(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
