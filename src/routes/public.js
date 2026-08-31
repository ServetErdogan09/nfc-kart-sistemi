const express = require('express');
const store = require('../data');

const router = express.Router();

router.get('/', (req, res) => {
  res.type('text/plain').send('Dijital musteri karti servisi calisiyor.');
});

router.get('/:slug', async (req, res, next) => {
  try {
    const customer = await store.getCustomerBySlug(req.params.slug);
    if (!customer || !customer.active) {
      return res.status(404).render('404');
    }

    await store.recordView(customer.slug);

    const buttons = customer.buttons
      .filter((b) => b.active)
      .map((b) => {
        const meta = store.BUTTON_CATALOG.find((c) => c.key === b.key);
        return {
          key: b.key,
          label: meta ? meta.label : b.key,
          icon: meta ? meta.icon : '🔗',
          comingSoon: !b.target,
        };
      });

    res.render('customer', { customer, buttons });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
