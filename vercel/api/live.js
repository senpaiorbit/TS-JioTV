const { getCredFromCookies, refresh_token, setCredentialsCookies, getJioTvData, parseJioCred, jio_sony_headers, cUrlGetData, cUrlGetResponse, setCorsHeaders } = require('./_lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = req.query.id;
  if (!id) {
    return res.status(400).send('Missing id parameter');
  }

  try {
    let cred = getCredFromCookies(req);
    if (!cred) return res.status(401).send('Not logged in');

    let haystack = await getJioTvData(id, cred);
    if (haystack.code !== 200) {
      cred = await refresh_token(req);
      if (cred) {
        const key = require('./_lib/functions').getCookie(req, 'jiotv_key') || '500';
        setCredentialsCookies(res, cred, key);
        haystack = await getJioTvData(id, cred);
      }
      if (haystack.code !== 200) {
        return res.redirect(req.url);
      }
    }

    const resultUrl = haystack.result;
    const qIdx = resultUrl.indexOf('?');
    const baseUrl = qIdx >= 0 ? resultUrl.substring(0, qIdx) : resultUrl;
    const query = qIdx >= 0 ? resultUrl.substring(qIdx + 1) : '';
    const cookies_y = query.includes('minrate=') ? query.split('&')[2] : query;
    const cook = Buffer.from(cookies_y).toString('hex');
    const chs = baseUrl.split('/');

    const headers_1 = { 'User-Agent': 'plaYtv/7.1.3 (Linux;Android 14) ExoPlayerLib/2.11.7' };

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');

    if (query.includes('bpk-tv')) {
      const playlist = await cUrlGetData(resultUrl, headers_1);
      let output = playlist
        .replace(/URI="/g, `URI="stream?cid=${id}&id=`)
        .replace(new RegExp(`${chs[4]}-video`, 'g'), `stream?cid=${id}&id=${chs[4]}-video`)
        .replace(new RegExp(`${chs[4]}-audio`, 'g'), `stream?cid=${id}&id=${chs[4]}-audio`);
      const fixDouble = `stream?cid=${id}&id=stream?cid=${id}&id=`;
      const fixDoubleTarget = `stream?cid=${id}&id=`;
      output = output.split(fixDouble).join(fixDoubleTarget);
      const fixKf = `stream?cid=${id}&id=keyframes/stream?cid=${id}&id=`;
      output = output.split(fixKf).join(`stream?cid=${id}&id=keyframes/`);
      output = output.split(`stream?cid=`).join(`stream?ck=${cook}&cid=`);
      return res.status(200).send(output);
    }

    if (query.includes('/HLS/')) {
      const link = chs.slice(0, 5).join('/');
      const link_1 = chs.slice(0, 7).join('/');
      const data = chs[5].split('_')[0];
      const playlist = await cUrlGetData(resultUrl, headers_1);

      let hdneaPart = 'hdnea' + (Buffer.from(cook, 'hex').toString('utf8')).split('hdnea')[1] || '';
      if (hdneaPart.startsWith('hdnea')) {
        hdneaPart = '__' + hdneaPart;
      }
      const cookFixed = Buffer.from(hdneaPart).toString('hex');

      const base_url = `s-live?id=${id}&ck=${cookFixed}&link=`;
      let output;
      if (playlist.includes('WL/')) {
        output = playlist
          .split(data).join(`${base_url}${link}&data=${data}`)
          .split('WL/').join(`${base_url}${link_1}&data=WL/`);
      } else {
        output = playlist
          .split(data).join(`${base_url}${link}&data=${data}`)
          .split('WL2/').join(`${base_url}${link_1}&data=WL2/`);
      }
      return res.status(200).send(output);
    }

    const fallback = await cUrlGetData('https://snehtv.pages.dev/video/tsjiotv.m3u8', headers_1);
    return res.status(200).send(fallback);
  } catch (e) {
    return res.status(500).send('Error: ' + e.message);
  }
};
