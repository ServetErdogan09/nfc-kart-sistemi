const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'db.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

// Panelde secilebilecek sabit buton katalogu. Musteri kaydinda hangileri
// aktif ve hedefleri ne oldugu tutulur; burasi sadece "hangi butonlar var" listesi.
const BUTTON_CATALOG = [
  { key: 'google', label: 'Google\'da Değerlendir', icon: '⭐' },
  { key: 'instagram', label: 'Instagram', icon: '📷' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { key: 'location', label: 'Konum', icon: '📍' },
  { key: 'campaigns', label: 'Kampanyalar', icon: '🎁' },
];

// Bu kelimeler slug olarak kullanilamaz, cunku ayni isimde sabit rotalarimiz var
// (orn. musteri slug'i "istatistik" olsaydi /istatistik/:token rotasiyla karisirdi).
const RESERVED_SLUGS = ['admin', 'r', 'istatistik'];

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Ayni anda gelen yazma islemlerini siraya koyar; boylece iki istek
// db.json'u ayni anda okuyup ustune yazarak birbirini ezmez.
let writeQueue = Promise.resolve();
function enqueue(task) {
  const result = writeQueue.then(task, task);
  writeQueue = result.then(() => {}, () => {});
  return result;
}

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CUSTOMERS_FILE)) {
    const seed = {
      customers: [
        {
          id: crypto.randomUUID(),
          slug: 'okan-atalay',
          name: 'OKAN ATALAY',
          subtitle: 'Gayrimenkul Danışmanlığı',
          location: 'Batman',
          accentColor: '#c9a24b',
          active: true,
          createdAt: new Date().toISOString(),
          statsToken: generateToken(),
          photoFilename: null,
          backgroundFilename: null,
          buttons: [
            {
              key: 'google',
              active: true,
              target: 'https://search.google.com/local/writereview?placeid=ChIJQ1d-3GNGC0AR7C3cBjIN-Xo',
            },
            { key: 'instagram', active: true, target: '' },
            { key: 'whatsapp', active: false, target: '' },
            { key: 'location', active: false, target: '' },
            { key: 'campaigns', active: false, target: '' },
          ],
        },
      ],
    };
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(seed, null, 2));
  }
  if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify({ events: [] }, null, 2));
  }

  // Gecmiste olusturulmus, statsToken alani olmayan musterileri tamamlar.
  // Boylece daha once canliya alinmis veriler de yeni ozellikten (musteri istatistik linki) faydalanir.
  const db = readJson(CUSTOMERS_FILE);
  let changed = false;
  db.customers.forEach((c) => {
    if (!c.statsToken) {
      c.statsToken = generateToken();
      changed = true;
    }
  });
  if (changed) {
    writeJson(CUSTOMERS_FILE, db);
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeButtons(inputButtons) {
  const map = new Map((inputButtons || []).map((b) => [b.key, b]));
  return BUTTON_CATALOG.map(({ key }) => {
    const existing = map.get(key) || {};
    return {
      key,
      active: Boolean(existing.active),
      target: (existing.target || '').trim(),
    };
  });
}

async function listCustomers() {
  ensureDataFiles();
  const { customers } = readJson(CUSTOMERS_FILE);
  return customers;
}

async function getCustomerBySlug(slug) {
  const customers = await listCustomers();
  return customers.find((c) => c.slug === slug) || null;
}

async function getCustomerById(id) {
  const customers = await listCustomers();
  return customers.find((c) => c.id === id) || null;
}

async function createCustomer(data) {
  return enqueue(async () => {
    ensureDataFiles();
    const db = readJson(CUSTOMERS_FILE);
    const slug = slugify(data.slug || data.name);
    if (!slug) throw new Error('Gecerli bir slug uretilemedi.');
    if (RESERVED_SLUGS.includes(slug)) {
      throw new Error(`"${slug}" adresi sistem tarafindan kullanildigi icin secilemez.`);
    }
    if (db.customers.some((c) => c.slug === slug)) {
      throw new Error(`"${slug}" adresi zaten kullaniliyor.`);
    }
    const customer = {
      id: crypto.randomUUID(),
      slug,
      name: data.name || '',
      subtitle: data.subtitle || '',
      location: data.location || '',
      accentColor: data.accentColor || '#c9a24b',
      active: data.active !== false,
      createdAt: new Date().toISOString(),
      statsToken: generateToken(),
      photoFilename: null,
      backgroundFilename: null,
      buttons: normalizeButtons(data.buttons),
    };
    db.customers.push(customer);
    writeJson(CUSTOMERS_FILE, db);
    return customer;
  });
}

async function updateCustomer(id, data) {
  return enqueue(async () => {
    ensureDataFiles();
    const db = readJson(CUSTOMERS_FILE);
    const idx = db.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Musteri bulunamadi.');

    const newSlug = slugify(data.slug || db.customers[idx].slug);
    if (!newSlug) throw new Error('Gecerli bir slug uretilemedi.');
    if (RESERVED_SLUGS.includes(newSlug)) {
      throw new Error(`"${newSlug}" adresi sistem tarafindan kullanildigi icin secilemez.`);
    }
    const clashes = db.customers.some((c) => c.slug === newSlug && c.id !== id);
    if (clashes) throw new Error(`"${newSlug}" adresi baska bir musteride kullaniliyor.`);

    db.customers[idx] = {
      ...db.customers[idx],
      slug: newSlug,
      name: data.name || '',
      subtitle: data.subtitle || '',
      location: data.location || '',
      accentColor: data.accentColor || '#c9a24b',
      active: data.active !== false,
      buttons: normalizeButtons(data.buttons),
    };
    writeJson(CUSTOMERS_FILE, db);
    return db.customers[idx];
  });
}

async function setCustomerActive(id, active) {
  return enqueue(async () => {
    ensureDataFiles();
    const db = readJson(CUSTOMERS_FILE);
    const idx = db.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Musteri bulunamadi.');
    db.customers[idx].active = active;
    writeJson(CUSTOMERS_FILE, db);
    return db.customers[idx];
  });
}

async function getCustomerByStatsToken(token) {
  const customers = await listCustomers();
  return customers.find((c) => c.statsToken === token) || null;
}

async function regenerateStatsToken(id) {
  return enqueue(async () => {
    ensureDataFiles();
    const db = readJson(CUSTOMERS_FILE);
    const idx = db.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Musteri bulunamadi.');
    db.customers[idx].statsToken = generateToken();
    writeJson(CUSTOMERS_FILE, db);
    return db.customers[idx];
  });
}

async function setCustomerPhoto(id, kind, filename) {
  return enqueue(async () => {
    ensureDataFiles();
    const db = readJson(CUSTOMERS_FILE);
    const idx = db.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Musteri bulunamadi.');
    const field = kind === 'background' ? 'backgroundFilename' : 'photoFilename';
    db.customers[idx][field] = filename;
    writeJson(CUSTOMERS_FILE, db);
    return db.customers[idx];
  });
}

async function deleteCustomer(id) {
  return enqueue(async () => {
    ensureDataFiles();
    const db = readJson(CUSTOMERS_FILE);
    db.customers = db.customers.filter((c) => c.id !== id);
    writeJson(CUSTOMERS_FILE, db);
  });
}

async function recordEvent(entry) {
  return enqueue(async () => {
    ensureDataFiles();
    const db = readJson(EVENTS_FILE);
    db.events.push({ ...entry, timestamp: new Date().toISOString() });
    writeJson(EVENTS_FILE, db);
  });
}

async function recordView(slug) {
  return recordEvent({ type: 'view', slug });
}

async function recordClick(slug, key) {
  return recordEvent({ type: 'click', slug, key });
}

async function getStats(slug) {
  ensureDataFiles();
  const { events } = readJson(EVENTS_FILE);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const forSlug = events.filter((e) => e.slug === slug);

  const withinDays = (e, days) => now - new Date(e.timestamp).getTime() <= days * day;

  const totalViews = forSlug.filter((e) => e.type === 'view').length;
  const totalClicks = forSlug.filter((e) => e.type === 'click').length;

  const byButton = {};
  forSlug.filter((e) => e.type === 'click').forEach((e) => {
    byButton[e.key] = (byButton[e.key] || 0) + 1;
  });

  const last7 = forSlug.filter((e) => withinDays(e, 7));
  const last30 = forSlug.filter((e) => withinDays(e, 30));

  return {
    totalViews,
    totalClicks,
    byButton,
    last7: {
      views: last7.filter((e) => e.type === 'view').length,
      clicks: last7.filter((e) => e.type === 'click').length,
    },
    last30: {
      views: last30.filter((e) => e.type === 'view').length,
      clicks: last30.filter((e) => e.type === 'click').length,
    },
  };
}

async function getDashboardSummary() {
  const customers = await listCustomers();
  const rows = [];
  for (const customer of customers) {
    const stats = await getStats(customer.slug);
    rows.push({ customer, totalViews: stats.totalViews, totalClicks: stats.totalClicks });
  }
  return rows;
}

module.exports = {
  BUTTON_CATALOG,
  slugify,
  listCustomers,
  getCustomerBySlug,
  getCustomerById,
  getCustomerByStatsToken,
  createCustomer,
  updateCustomer,
  setCustomerActive,
  regenerateStatsToken,
  setCustomerPhoto,
  deleteCustomer,
  recordView,
  recordClick,
  getStats,
  getDashboardSummary,
};
