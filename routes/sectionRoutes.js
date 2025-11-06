const express = require("express");
const router = express.Router();
const Section = require("../models/Section");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

/* ============================================================
   ➕ إنشاء سكشن جديد (Admin فقط)
   ============================================================ */
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name } = req.body;

    const newSection = await Section.create({ name });

    res.status(201).json({
      message: "✅ تم إنشاء السكشن بنجاح",
      section: newSection,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ خطأ في السيرفر", details: err.message });
  }
});

/* ============================================================
   📋 عرض كل السكشنات
   ============================================================ */
router.get("/", async (req, res) => {
  try {
    const sections = await Section.find();
    res.json(sections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ خطأ في السيرفر" });
  }
});

module.exports = router;
