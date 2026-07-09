const fetch = require('node-fetch');
const setCookieParser = require('set-cookie-parser');

const CONSTANTS = {
  APPKEY: 'NzNiMDhlYcQyNjJm',
  USERGROUP: 'tvYR7NSNn7rymo3F',
  VERSION_CODE: '452',
  USER_AGENT: 'plaYtv/7.1.3 (Linux;Android 14) ExoPlayerLib/2.11.7',
  TOKEN_EXPIRY_TIME: 7000,
  COOKIE_EXPIRY_TIME: 40000,
  OTP_USER_AGENT: 'okhttp/3.14.9',
};

function encrypt_data(data, key) {
  const k = parseInt(key, 10);
  const encrypted = Buffer.from(data).map(b => b + k);
  return encrypted.toString('base64');
}

function decrypt_data(e_data, key) {
  const k = parseInt(key, 10);
  const decoded = Buffer.from(e_data, 'base64');
  const decrypted = decoded.map(b => b - k);
  return decrypted.toString('utf8');
}

function jio_headers(cookies, access_token, crm, device_id, ssoToken, uniqueId) {
  return {
    'Cookie': cookies,
    'accesstoken': access_token,
    'appkey': CONSTANTS.APPKEY,
    'channel_id': '144',
    'crmid': crm,
    'deviceId': device_id,
    'devicetype': 'phone',
    'isott': 'true',
    'languageId': '6',
    'lbcookie': '1',
    'os': 'android',
    'osVersion': '14',
    'srno': '250918144000',
    'ssotoken': ssoToken,
    'subscriberId': crm,
    'uniqueId': uniqueId,
    'User-Agent': CONSTANTS.USER_AGENT,
    'usergroup': CONSTANTS.USERGROUP,
    'versionCode': CONSTANTS.VERSION_CODE,
    'Origin': 'https://www.jiocinema.com',
    'Referer': 'https://www.jiocinema.com/',
  };
}

function jio_sony_headers(hexCook, id, crm, device_id, access_token, uniqueId, ssoToken) {
  const rawCookie = Buffer.from(hexCook, 'hex').toString('utf8');
  return {
    'Cookie': rawCookie,
    'appkey': CONSTANTS.APPKEY,
    'accesstoken': access_token,
    'channel_id': id,
    'channelid': id,
    'crmid': crm,
    'deviceId': device_id,
    'devicetype': 'phone',
    'x-platform': 'android',
    'srno': '250918144000',
    'ssotoken': ssoToken,
    'subscriberId': crm,
    'uniqueId': uniqueId,
    'User-Agent': CONSTANTS.USER_AGENT,
    'usergroup': CONSTANTS.USERGROUP,
    'versionCode': CONSTANTS.VERSION_CODE,
    'appname': 'RJIL_JioTV',
    'Origin': 'https://www.jiocinema.com',
    'Referer': 'https://www.jiocinema.com/',
  };
}

function jio_headers_catchup(hexCook, crm, device_id, ssoToken, uniqueId) {
  const rawCookie = Buffer.from(hexCook, 'hex').toString('utf8');
  return {
    'Cookie': rawCookie,
    'appkey': CONSTANTS.APPKEY,
    'channel_id': '144',
    'channelid': '144',
    'crmid': crm,
    'deviceId': device_id,
    'devicetype': 'phone',
    'isott': 'true',
    'languageId': '6',
    'lbcookie': '1',
    'os': 'android',
    'osVersion': '14',
    'srno': '250918144000',
    'ssotoken': ssoToken,
    'subscriberId': crm,
    'uniqueId': uniqueId,
    'appname': 'RJIL_JioTV',
    'User-Agent': CONSTANTS.USER_AGENT,
    'usergroup': CONSTANTS.USERGROUP,
    'versionCode': CONSTANTS.VERSION_CODE,
  };
}

async function cUrlGetData(url, headers = null, post_fields = null) {
  const opts = {
    method: post_fields ? 'POST' : 'GET',
    headers: headers || {},
    timeout: 8000,
  };
  if (post_fields) {
    opts.body = post_fields;
  }
  const resp = await fetch(url, opts);
  return resp.text();
}

async function cUrlGetResponse(url, headers = null, post_fields = null) {
  const opts = {
    method: post_fields ? 'POST' : 'GET',
    headers: headers || {},
    timeout: 8000,
  };
  if (post_fields) {
    opts.body = post_fields;
  }
  return fetch(url, opts);
}

async function getCookiesFromUrl(url, headers = [], post_fields = null) {
  const opts = {
    method: post_fields ? 'POST' : 'GET',
    headers: headers || {},
    timeout: 8000,
  };
  if (post_fields) {
    opts.body = post_fields;
  }
  const resp = await fetch(url, opts);
  const setCookieRaw = resp.headers.raw()['set-cookie'] || [];
  const cookies = {};
  for (const raw of setCookieRaw) {
    const parsed = setCookieParser.parse([raw], { decodeValues: false });
    for (const c of parsed) {
      cookies[c.name] = c.value;
    }
  }
  return cookies;
}

function getCredFromCookies(req) {
  const credsCookie = getCookie(req, 'jiotv_creds');
  const keyCookie = getCookie(req, 'jiotv_key');
  if (!credsCookie || !keyCookie) return null;
  try {
    return JSON.parse(decrypt_data(credsCookie, keyCookie));
  } catch (e) {
    return null;
  }
}

function setCredentialsCookies(res, credJson, key) {
  const encrypted = encrypt_data(JSON.stringify(credJson), key);
  const maxAge = 86400 * 30;
  res.setHeader('Set-Cookie', [
    `jiotv_creds=${encrypted}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
    `jiotv_key=${key}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  ]);
}

function deleteCredentialsCookies(res) {
  res.setHeader('Set-Cookie', [
    'jiotv_creds=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    'jiotv_key=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  ]);
}

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function refresh_token(req) {
  const cred = getCredFromCookies(req);
  if (!cred) return null;
  const refreshApi = 'https://auth.media.jio.com/tokenservice/apis/v1/refreshtoken?langId=6';
  const body = JSON.stringify({
    appName: 'RJIL_JioTV',
    deviceId: cred.deviceId,
    refreshToken: cred.refreshToken,
  });
  const headers = {
    'accesstoken': cred.authToken,
    'uniqueId': cred.sessionAttributes?.user?.unique || '',
    'devicetype': 'phone',
    'versionCode': '331',
    'os': 'android',
    'Content-Type': 'application/json',
  };
  const resp = await cUrlGetData(refreshApi, headers, body);
  const data = JSON.parse(resp);
  if (data.authToken) {
    cred.authToken = data.authToken;
  }
  return cred;
}

async function get_and_refresh_cookie(url, headers, existingHexCookie) {
  const cookies = await getCookiesFromUrl(url, headers);
  if (cookies['__hdnea__']) {
    return Buffer.from(`__hdnea__=${cookies['__hdnea__']}`).toString('hex');
  }
  return existingHexCookie || '';
}

function parseJioCred(cred) {
  const user = cred.sessionAttributes?.user || {};
  return {
    ssoToken: cred.ssoToken || '',
    access_token: cred.authToken || '',
    crm: user.subscriberId || '',
    uniqueId: user.unique || '',
    device_id: cred.deviceId || '',
  };
}

async function getJioTvData(id, cred) {
  const { access_token, crm, uniqueId, device_id } = parseJioCred(cred);
  const post_data = new URLSearchParams({ stream_type: 'Seek', channel_id: id }).toString();
  const headers = {
    'Host': 'jiotvapi.media.jio.com',
    'Content-Type': 'application/x-www-form-urlencoded',
    'appkey': 'NzNiMDhlYzQyNjJm',
    'channel_id': id,
    'userid': crm,
    'crmid': crm,
    'deviceId': device_id,
    'devicetype': 'phone',
    'isott': 'true',
    'languageId': '6',
    'lbcookie': '1',
    'os': 'android',
    'dm': 'Xiaomi 22101316UP',
    'osversion': '14',
    'srno': '250918144000',
    'accesstoken': access_token,
    'subscriberid': crm,
    'uniqueId': uniqueId,
    'content-length': String(Buffer.byteLength(post_data)),
    'usergroup': CONSTANTS.USERGROUP,
    'User-Agent': 'okhttp/4.12.13',
    'versionCode': CONSTANTS.VERSION_CODE,
  };
  const resp = await cUrlGetData('https://jiotvapi.media.jio.com/playback/apis/v1/geturl?langId=6', headers, post_data);
  return JSON.parse(resp);
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Accept-Ranges', 'bytes');
}

function generateKey() {
  return String(Math.floor(Math.random() * 900) + 100);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  CONSTANTS,
  encrypt_data,
  decrypt_data,
  jio_headers,
  jio_sony_headers,
  jio_headers_catchup,
  cUrlGetData,
  cUrlGetResponse,
  getCookiesFromUrl,
  getCredFromCookies,
  setCredentialsCookies,
  deleteCredentialsCookies,
  refresh_token,
  get_and_refresh_cookie,
  parseJioCred,
  getJioTvData,
  setCorsHeaders,
  generateKey,
  escapeHtml,
};
