const fetch = require('node-fetch');
const { CONSTANTS, encrypt_data, generateKey, setCorsHeaders, setCredentialsCookies } = require('./_lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    let body = '';
    for await (const chunk of req) body += chunk;
    const params = new URLSearchParams(body);
    const mobile = params.get('user');
    const otp = params.get('otp');

    if (!mobile || !otp) {
      return res.status(400).json({ status: 'error', message: 'Missing user or otp' });
    }

    const verifyApi = 'https://jiotvapi.media.jio.com/userservice/apis/v1/loginotp/verify';
    const payload = JSON.stringify({
      number: Buffer.from('+91' + mobile).toString('base64'),
      otp: otp,
      deviceInfo: {
        consumptionDeviceName: 'RMX1945',
        info: {
          type: 'android',
          platform: { name: 'RMX1945' },
          androidId: require('crypto').randomBytes(8).toString('hex').slice(0, 16),
        },
      },
    });
    const headers = {
      'appname': 'RJIL_JioTV',
      'os': 'android',
      'devicetype': 'phone',
      'content-type': 'application/json',
      'user-agent': CONSTANTS.OTP_USER_AGENT,
    };

    const resp = await fetch(verifyApi, {
      method: 'POST',
      headers,
      body: payload,
      timeout: 10000,
    });

    const data = await resp.json().catch(() => ({}));

    if (data.ssoToken) {
      const key = generateKey();
      setCredentialsCookies(res, data, key);
      return res.status(200).json({ status: 'success', message: 'Jio LoggedIn Successfully' });
    }

    let msg = 'Unknown Error Occurred';
    if (data.message) {
      msg = 'Jio Error - ' + data.message;
    } else if (data.errors?.[1]?.message) {
      msg = 'Jio Error - ' + data.errors[1].message;
    } else if (data.errors?.[0]?.message) {
      msg = 'Jio Error - ' + data.errors[0].message;
    }
    return res.status(200).json({ status: 'error', user: mobile, message: msg });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: 'Server Error: ' + e.message });
  }
};
