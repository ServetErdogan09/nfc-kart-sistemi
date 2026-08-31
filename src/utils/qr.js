const QRCode = require('qrcode');

async function generateQrPngBuffer(url) {
  return QRCode.toBuffer(url, {
    type: 'png',
    width: 600,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

module.exports = { generateQrPngBuffer };
