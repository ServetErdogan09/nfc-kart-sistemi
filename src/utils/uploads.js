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

// Yeni musteri olustururken henuz bir id yok, o yuzden dosyayi diske degil
// once belleğe (buffer) aliyoruz; musteri kaydedilip id'si belli olduktan
// sonra savePhotoBuffer ile gercek dosya adiyla diske yaziyoruz.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
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

// Multer'in bellekte tuttugu dosyayi (file.buffer) musterinin id'sine gore
// adlandirip kalici diske yazar, eski (farkli uzantili) surumunu temizler.
function savePhotoBuffer(customerId, kind, file) {
  ensureUploadsDir();
  const ext = MIME_TO_EXT[file.mimetype] || '.jpg';
  const filename = `${customerId}-${kind}${ext}`;
  deleteExistingPhotos(customerId, kind, filename);
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
  return filename;
}

module.exports = { UPLOADS_DIR, PHOTO_KINDS, upload, savePhotoBuffer, deleteAllPhotos, ensureUploadsDir };
