const express = require('express');
const store = require('../data');
const { generateQrPngBuffer } = require('../utils/qr');

const router = express.Router();

function getBaseUrl(req) {
  return process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

function buttonsFromForm(body) {
  return store.BUTTON_CATALOG.map(({ key }) => ({
    key,
    active: body[`button_${key}_active`] === 'on',
    target: (body[`button_${key}_target`] || '').trim(),
  }));
}

router.get('/', async (req, res, next) => {
  try {
    const rows = await store.getDashboardSummary();
    res.render('admin/dashboard', { rows, baseUrl: getBaseUrl(req) });
  } catch (err) {
    next(err);
  }
});

router.get('/customers/new', (req, res) => {
  res.render('admin/form', {
    mode: 'create',
    customer: null,
    catalog: store.BUTTON_CATALOG,
    error: null,
  });
});

router.post('/customers', async (req, res, next) => {
  try {
    await store.createCustomer({
      ...req.body,
      active: req.body.active === 'on',
      buttons: buttonsFromForm(req.body),
    });
    res.redirect('/admin');
  } catch (err) {
    res.status(400).render('admin/form', {
      mode: 'create',
      customer: req.body,
      catalog: store.BUTTON_CATALOG,
      error: err.message,
    });
  }
});

router.get('/customers/:id/edit', async (req, res, next) => {
  try {
    const customer = await store.getCustomerById(req.params.id);
    if (!customer) return res.status(404).send('Musteri bulunamadi.');
    res.render('admin/form', { mode: 'edit', customer, catalog: store.BUTTON_CATALOG, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/customers/:id', async (req, res, next) => {
  try {
    await store.updateCustomer(req.params.id, {
      ...req.body,
      active: req.body.active === 'on',
      buttons: buttonsFromForm(req.body),
    });
    res.redirect('/admin');
  } catch (err) {
    const customer = { ...req.body, id: req.params.id };
    res.status(400).render('admin/form', {
      mode: 'edit',
      customer,
      catalog: store.BUTTON_CATALOG,
      error: err.message,
    });
  }
});

router.post('/customers/:id/toggle', async (req, res, next) => {
  try {
    const customer = await store.getCustomerById(req.params.id);
    if (!customer) return res.status(404).send('Musteri bulunamadi.');
    await store.setCustomerActive(customer.id, !customer.active);
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

router.post('/customers/:id/delete', async (req, res, next) => {
  try {
    await store.deleteCustomer(req.params.id);
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

router.get('/customers/:id/stats', async (req, res, next) => {
  try {
    const customer = await store.getCustomerById(req.params.id);
    if (!customer) return res.status(404).send('Musteri bulunamadi.');
    const stats = await store.getStats(customer.slug);
    res.render('admin/stats', {
      customer,
      stats,
      catalog: store.BUTTON_CATALOG,
      baseUrl: getBaseUrl(req),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/customers/:id/qr.png', async (req, res, next) => {
  try {
    const customer = await store.getCustomerById(req.params.id);
    if (!customer) return res.status(404).send('Musteri bulunamadi.');
    const url = `${getBaseUrl(req)}/${customer.slug}`;
    const buffer = await generateQrPngBuffer(url);
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="${customer.slug}-qr.png"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
