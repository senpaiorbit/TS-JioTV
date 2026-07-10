const { deleteCredentialsCookies, setCorsHeaders } = require('./lib/functions');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  deleteCredentialsCookies(res);
  return res.status(200).json({ status: 'success', message: 'Logged out' });
};
