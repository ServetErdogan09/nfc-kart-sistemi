const express = require('express');
const store = require('../data');

const router = express.Router();

router.get('/:slug/:key', async (req, res, next) => {
  try {
    const { slug, key } = req.params;
    const customer = await store.getCustomerBySlug(slug);
    if (!customer || !customer.active) {
      return res.status(404).render('404');
    }

    const button = customer.buttons.find((b) => b.key === key && b.active);
    if (!button || !button.target) {
      return res.status(404).render('404');
    }

    await store.recordClick(slug, key);
    res.redirect(302, button.target);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
