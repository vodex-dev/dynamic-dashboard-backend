const express = require("express");
const router = express.Router();
const Field = require("../models/Field");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

/* ============================================================
   ✅ جلب جميع الحقول (مفتوح - لا يحتاج توكن)
   ============================================================ */
router.get("/", async (req, res) => {
  try {
    const fields = await Field.find().populate("sectionId", "name");
    res.status(200).json(fields);
  } catch (err) {
    console.error("❌ خطأ في جلب الحقول:", err);
    res.status(500).json({ error: "فشل في جلب الحقول", details: err.message });
  }
});

/* ============================================================
   ✅ جلب جميع الحقول ضمن سكشن معين (مفتوح - لا يحتاج توكن)
   ============================================================ */
router.get("/:sectionId", async (req, res) => {
  try {
    const fields = await Field.find({ sectionId: req.params.sectionId });
    res.status(200).json(fields);
  } catch (err) {
    console.error("❌ خطأ في جلب الحقول الخاصة بالسكشن:", err);
    res.status(500).json({ error: "فشل في جلب الحقول", details: err.message });
  }
});

/* ============================================================
   🔒 إنشاء حقل جديد (Admins فقط)
   ============================================================ */
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { sectionId, name, type, content } = req.body;

    if (!sectionId || !name || !type) {
      return res.status(400).json({ error: "❌ يجب إدخال sectionId و name و type" });
    }

    const newField = await Field.create({ sectionId, name, type, content });

    res.status(201).json({
      message: "✅ تم إنشاء الحقل بنجاح",
      field: newField,
    });
  } catch (err) {
    console.error("❌ خطأ في إنشاء الحقل:", err);
    res.status(500).json({ error: "فشل في إنشاء الحقل", details: err.message });
  }
});

/* ============================================================
   🔒 تعديل الحقل بالكامل (Admins فقط)
   ============================================================ */
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, type, content } = req.body;

    const updatedField = await Field.findByIdAndUpdate(
      req.params.id,
      { name, type, content },
      { new: true }
    );

    if (!updatedField) {
      return res.status(404).json({ message: "❌ الحقل غير موجود" });
    }

    res.status(200).json({
      message: "✅ تم تحديث الحقل بنجاح",
      field: updatedField,
    });
  } catch (err) {
    console.error("❌ خطأ في تحديث الحقل:", err);
    res.status(500).json({ error: "فشل في تحديث الحقل", details: err.message });
  }
});

/* ============================================================
   ✏️ تعديل محتوى الحقل فقط (User أو Admin)
   ============================================================ */
router.patch("/:id/content", authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const field = await Field.findById(req.params.id);

    if (!field) {
      return res.status(404).json({ message: "❌ الحقل غير موجود" });
    }

    console.log(`👤 المستخدم ${req.user.id} يقوم بتحديث محتوى الحقل ${req.params.id}`);

    // تحديث فقط المحتوى
    field.content = content;
    await field.save();

    res.status(200).json({
      message: "✅ تم تحديث المحتوى بنجاح",
      field,
    });
  } catch (err) {
    console.error("❌ خطأ في تحديث المحتوى:", err);
    res.status(500).json({ error: "فشل في تحديث المحتوى", details: err.message });
  }
});

/* ============================================================
   🔒 حذف الحقل (Admins فقط)
   ============================================================ */
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    await Field.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "✅ تم حذف الحقل بنجاح" });
  } catch (err) {
    console.error("❌ خطأ في حذف الحقل:", err);
    res.status(500).json({ error: "فشل في حذف الحقل", details: err.message });
  }
});

module.exports = router;
