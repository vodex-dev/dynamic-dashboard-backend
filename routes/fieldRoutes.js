const express = require("express");
const router = express.Router();
const Field = require("../models/Field");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

/* ============================================================
   🧱 إنشاء حقل جديد (Admin فقط)
   ============================================================ */
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { sectionId, name, type, content } = req.body;

    const newField = await Field.create({ sectionId, name, type, content });

    res.status(201).json({
      message: "✅ تم إنشاء الحقل بنجاح",
      field: newField,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ خطأ في السيرفر", details: err.message });
  }
});

/* ============================================================
   📋 عرض جميع الحقول ضمن سكشن معين
   ============================================================ */
router.get("/:sectionId", authMiddleware, async (req, res) => {
  try {
    const fields = await Field.find({ sectionId: req.params.sectionId });
    res.json(fields);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ خطأ في السيرفر" });
  }
});

/* ============================================================
   ✏️ تعديل الحقل بالكامل (Admin فقط)
   ============================================================ */
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, type, content } = req.body;
    const updatedField = await Field.findByIdAndUpdate(
      req.params.id,
      { name, type, content },
      { new: true }
    );

    if (!updatedField)
      return res.status(404).json({ message: "❌ الحقل غير موجود" });

    res.json({
      message: "✅ تم تحديث الحقل بنجاح",
      field: updatedField,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ خطأ في السيرفر", details: err.message });
  }
});

/* ============================================================
   🪶 تعديل محتوى الحقل فقط (User أو Admin)
   ============================================================ */
router.patch("/:id/content", authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const field = await Field.findById(req.params.id);

    if (!field)
      return res.status(404).json({ message: "❌ الحقل غير موجود" });

    // تحديث فقط المحتوى
    field.content = content;
    await field.save();

    res.json({
      message: "✅ تم تحديث المحتوى بنجاح",
      field,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ خطأ في السيرفر", details: err.message });
  }
});

module.exports = router;
