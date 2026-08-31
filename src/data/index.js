// Veri katmani secim noktasi. Su an tek implementasyon JSON dosyasi.
// Ileride Postgres'e gecerken burada `require('./pgStore')` yapman yeterli;
// pgStore.js'in de jsonStore.js ile ayni fonksiyon isimlerini export etmesi gerekir.
module.exports = require('./jsonStore');
