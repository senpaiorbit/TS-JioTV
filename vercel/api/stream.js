const { get_and_refresh_cookie, cUrlGetData, setCorsHeaders } = require('./lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = req.query.id;
  const cid = req.query.cid;
  const cooks = req.query.ck;

  if (!cid || !cooks) {
    return res.status(400).send('Missing required parameters');
  }

  try {
    const chs = cid.split('-');
    const cookie = Buffer.from(cooks, 'hex').toString('utf8');

    const headers = {
      'Cookie': cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'plaYtv/7.1.3 (Linux;Android 14) ExoPlayerLib/2.11.7',
    };

    const url = `https://jiotvmblive.cdn.jio.com/bpk-tv/${chs[0]}/Fallback/${cid}`;
    const hs = await cUrlGetData(url, headers);
    const cuk = await get_and_refresh_cookie(url, headers, cooks);

    const search = [',URI="https://tv.media.jio.com/fallback/bpk-tv/', `${chs[0]}-`, '.ts'];
    const replace = [
      `,URI="auth?ck=${cuk}&pkey=`,
      `${chs[0]}-`,
      '.ts',
    ];

    let output = hs;
    for (let i = 0; i < search.length; i++) {
      output = output.split(search[i]).join(replace[i]);
    }
    return res.status(200).send(output);
  } catch (e) {
    return res.status(500).send('Error: ' + e.message);
  }
};
