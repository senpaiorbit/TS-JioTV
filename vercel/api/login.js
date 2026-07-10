const fetch = require('node-fetch');
const { CONSTANTS, encrypt_data, generateKey, setCorsHeaders } = require('./lib/functions');

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
    const mobile = params.get('username');

    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({ status: 'error', message: 'Invalid mobile number' });
    }

    const otpApi = 'https://jiotvapi.media.jio.com/userservice/apis/v1/loginotp/send';
    const payload = JSON.stringify({ number: Buffer.from('+91' + mobile).toString('base64') });
    const headers = {
      'appname': 'RJIL_JioTV',
      'os': 'android',
      'devicetype': 'phone',
      'content-type': 'application/json',
      'user-agent': CONSTANTS.OTP_USER_AGENT,
    };

    const resp = await fetch(otpApi, {
      method: 'POST',
      headers,
      body: payload,
      timeout: 10000,
    });

    if (resp.status === 204) {
      return res.status(200).json({ status: 'success', user: mobile, message: 'OTP Sent Successfully' });
    }

    const data = await resp.json().catch(() => ({}));
    const msg = data.message || `Unknown Error Occurred: Code ${resp.status}`;
    return res.status(200).json({ status: 'error', user: mobile, message: 'Jio Error - ' + msg });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: 'Server Error: ' + e.message });
  }
};
