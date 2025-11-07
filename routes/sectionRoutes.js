const express = require('express');
const router = express.Router();
const Section = require('../models/Section');
const authMiddleware = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminOnly');

// 🟢 إنشاء سكشن جديد
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { name, pageId } = req.body;
  if (!name || !pageId) {
    return res.status(400).json({ error: '❌ لازم تدخل اسم و pageId' });
  }

  try {
    const newSection = await Section.create({
      name,
      pageId,
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: '✅ تم إنشاء السكشن بنجاح',
      section: newSection,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ فشل في إنشاء السكشن', details: err.message });
  }
});

// 🟡 جلب كل السكشنز لصفحة معينة
router.get('/:pageId', authMiddleware, async (req, res) => {
  try {
    const { pageId } = req.params;
    const sections = await Section.find({ pageId });
    res.json(sections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ فشل في جلب السكشنات', details: err.message });
  }
});

// 🔵 (اختياري) جلب كل السكشنات بالنظام
router.get('/', async (req, res) => {
  try {
    const sections = await Section.find();
    res.json(sections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ فشل في جلب السكشنات', details: err.message });
  }
});

module.exports = router;
