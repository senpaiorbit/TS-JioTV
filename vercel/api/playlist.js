const { cUrlGetData, setCorsHeaders } = require('./lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || req.headers['x-forwarded-host'];
    const baseUrl = `${proto}://${host}`;

    const jio_fname = `TS-JioTV_${require('crypto').createHash('md5').update(String(Date.now()) + 'JioTV').digest('hex')}.m3u`;
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', `inline; filename=${jio_fname}`);

    const url = 'https://jioappsd.akamaized.net/appconfig/v3/getchannelslist?langId=6';
    const json_data = await cUrlGetData(url, {
      'user-agent': 'okhttp/4.12.13',
      'Accept-Encoding': 'gzip',
    });
    const json = JSON.parse(json_data);

    let jio_data = '#EXTM3U x-tvg-url="https://avkb.short.gy/jioepg.xml.gz"\n';

    if (Array.isArray(json)) {
      for (const channel of json) {
        const channel_id = channel.channel_id || '';
        const channel_name = channel.channel_name || '';
        const channel_category = channel.channelCategoryId || '';
        const channel_language = channel.channelLanguageId || '';
        const logo_url = channel.logoUrl || '';

        const catchup_source = `${baseUrl}/cpapi?id=${encodeURIComponent(channel_id)}&srno=\${catchup-id}&begin={start}&end=\${stop}&e=.m3u8`;
        const stream_url = `${baseUrl}/live?id=${encodeURIComponent(channel_id)}&e=.m3u8`;

        let extinf = `#EXTINF:-1 tvg-id="${channel_id}" tvg-name="${channel_name}" tvg-type="${channel_category}" group-title="TS-JioTV ${channel_category}" tvg-language="${channel_language}" tvg-logo="${logo_url}"`;
        if (channel.isCatchupAvailable === 'True') {
          extinf += ` catchup-days="7" catchup="auto" catchup-source="${catchup_source}"`;
        }
        extinf += `,${channel_name}`;

        jio_data += extinf + '\n' + stream_url + '\n\n';
      }
    }

    return res.status(200).send(jio_data);
  } catch (e) {
    return res.status(500).send('Error: ' + e.message);
  }
};
