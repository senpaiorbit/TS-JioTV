const { getCredFromCookies, parseJioCred, jio_sony_headers, cUrlGetData, setCorsHeaders } = require('./lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const cred = getCredFromCookies(req);
    if (!cred) return res.status(401).send('Not logged in');

    const { ssoToken, access_token, crm, uniqueId, device_id } = parseJioCred(cred);
    const ck = req.query.ck || '';
    const ts = req.query.ts || '';
    const id = req.query.id || '';
    const link = req.query.link || '';
    const data = req.query.data || '';

    const headers = jio_sony_headers(ck, id, crm, device_id, access_token, uniqueId, ssoToken);

    if (link && data) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      const content = await cUrlGetData(`${link}/${data}`, headers);
      const basePath = `s-live?id=${id}&ck=${ck}&ts=${link}/`;

      let output = content;
      if (output.includes('WL/')) {
        output = output.split('WL/').join(`${basePath}WL/`);
      }
      if (output.includes('WL2/')) {
        output = output.split('WL2/').join(`${basePath}WL2/`);
      }

      const lastSlash = data.lastIndexOf('/');
      const trimmedPath = lastSlash >= 0 ? data.substring(0, lastSlash) : '';
      output = output.split('segment-').join(`${basePath}${trimmedPath}/segment-`);
      return res.status(200).send(output);
    }

    if (ts && ck) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Connection', 'keep-alive');
      const output = await cUrlGetData(ts, headers);
      return res.status(200).send(output);
    }

    return res.status(400).send('Missing parameters');
  } catch (e) {
    return res.status(500).send('Error: ' + e.message);
  }
};
