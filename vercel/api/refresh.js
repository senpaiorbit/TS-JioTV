const { getCredFromCookies, refresh_token, setCredentialsCookies, deleteCredentialsCookies, setCorsHeaders } = require('./lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const cred = getCredFromCookies(req);
      if (!cred) {
        return res.status(401).json({ status: 'error', message: 'Not logged in' });
      }
      const newCred = await refresh_token(req);
      if (!newCred) {
        return res.status(500).json({ status: 'error', message: 'Refresh failed' });
      }
      const key = require('./lib/functions').getCookie(req, 'jiotv_key') || '500';
      setCredentialsCookies(res, newCred, key);
      return res.status(200).json({ status: 'success', message: 'Token refreshed' });
    }

    deleteCredentialsCookies(res);
    return res.status(200).json({ status: 'success', message: 'Logged out' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e.message });
  }
};
