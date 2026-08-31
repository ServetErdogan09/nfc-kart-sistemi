const fs = require('fs');
const path = require('path');
const multer = require('multer');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const PHOTO_KINDS = ['profile', 'background'];

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Dosya adini kullanicidan gelen isimden degil, musteri id'si + tur (profile/background)
// kombinasyonundan turetiyoruz. Boylece hem dosya adi cakismasi/gizli yol (path traversal)
// riski olmuyor, hem de bir sonraki yukleme otomatik olarak eskisinin yerine geciyor.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDir();
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] || '.jpg';
    cb(null, `${req.params.id}-${req.params.kind}${ext}`);
  },
});

const uploadPhoto = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!PHOTO_KINDS.includes(req.params.kind)) {
      return cb(new Error('Gecersiz fotograf turu.'));
    }
    if (!MIME_TO_EXT[file.mimetype]) {
      return cb(new Error('Sadece JPG, PNG veya WEBP resim yukleyebilirsin.'));
    }
    cb(null, true);
  },
});

// Musterinin belirtilen turdeki eski fotograflarini siler. `exceptFilename` verilirse
// (yeni yuklenen dosya), onu atlar - farkli bir formatta yeniden yukleme yapildiginda
// eski uzantidaki dosyanin "yetim" kalmasini onlemek icin kullanilir.
function deleteExistingPhotos(customerId, kind, exceptFilename) {
  ensureUploadsDir();
  Object.values(MIME_TO_EXT).forEach((ext) => {
    const filename = `${customerId}-${kind}${ext}`;
    if (filename === exceptFilename) return;
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

function deleteAllPhotos(customerId) {
  PHOTO_KINDS.forEach((kind) => deleteExistingPhotos(customerId, kind, null));
}

module.exports = { UPLOADS_DIR, PHOTO_KINDS, uploadPhoto, deleteExistingPhotos, deleteAllPhotos, ensureUploadsDir };
