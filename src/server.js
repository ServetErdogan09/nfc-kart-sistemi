require('dotenv').config();
const path = require('path');
const express = require('express');

const basicAuth = require('./middleware/basicAuth');
const publicRoutes = require('./routes/public');
const redirectRoutes = require('./routes/redirect');
const adminRoutes = require('./routes/admin');

const app = express();

// Railway gibi platformlar uygulamayi bir proxy arkasinda calistirir.
// Bu olmadan req.protocol her zaman "http" doner ve QR/panel adresleri yanlis cikar.
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Sirali onemli: /admin ve /r once tanimlanmali, aksi halde /:slug
// hepsini "musteri sayfasi" sanip yutar.
app.use('/admin', basicAuth, adminRoutes);
app.use('/r', redirectRoutes);
app.use('/', publicRoutes);

app.use((req, res) => {
  res.status(404).render('404');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Beklenmeyen bir hata olustu.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Sunucu ${port} portunda calisiyor.`);
});
