const { cUrlGetData, setCorsHeaders } = require('./_lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const data = await cUrlGetData('https://jioappsd.akamaized.net/appconfig/v3/getchannelslist?langId=6', {
      'user-agent': 'okhttp/4.12.13',
      'Accept-Encoding': 'gzip',
    });
    const json = JSON.parse(data);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e.message });
  }
};
