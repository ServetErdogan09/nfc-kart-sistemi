const crypto = require('crypto');

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = function basicAuth(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    res.status(500).send('ADMIN_PASSWORD ortam degiskeni tanimli degil.');
    return;
  }

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const password = separatorIndex === -1 ? decoded : decoded.slice(separatorIndex + 1);
    if (safeEqual(password, expected)) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
  res.status(401).send('Yetkisiz erisim.');
};
