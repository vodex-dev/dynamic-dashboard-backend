const express = require("express");
const router = express.Router();
const Section = require("../models/Section");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

/* =====================================================
   ✅ جلب كل السكشنات (مفتوح - لا يحتاج توكن)
===================================================== */
router.get("/", async (req, res) => {
  try {
    const sections = await Section.find().populate("pageId", "name");
    res.status(200).json(sections);
  } catch (err) {
    console.error("❌ خطأ في جلب السكشنات:", err);
    res.status(500).json({ error: "فشل في جلب السكشنات", details: err.message });
  }
});

/* =====================================================
   ✅ جلب السكشنات حسب صفحة معينة (مفتوح - لا يحتاج توكن)
===================================================== */
router.get("/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const sections = await Section.find({ pageId });
    res.status(200).json(sections);
  } catch (err) {
    console.error("❌ خطأ في جلب سكشنات الصفحة:", err);
    res.status(500).json({ error: "فشل في جلب سكشنات الصفحة", details: err.message });
  }
});

/* =====================================================
   🔒 إنشاء سكشن جديد (Admins فقط)
===================================================== */
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, pageId } = req.body;

    if (!name || !pageId) {
      return res.status(400).json({ error: "❌ يجب إدخال الاسم و pageId" });
    }

    const newSection = await Section.create({
      name,
      pageId,
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: "✅ تم إنشاء السكشن بنجاح",
      section: newSection,
    });
  } catch (err) {
    console.error("❌ خطأ في إنشاء السكشن:", err);
    res.status(500).json({ error: "فشل في إنشاء السكشن", details: err.message });
  }
});

module.exports = router;
