const express = require("express");
const router = express.Router();
const Collection = require("../models/Collection");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

/* =====================================================
   ✅ جلب جميع الكولكشنز (Admins فقط)
===================================================== */
router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const collections = await Collection.find().populate("createdBy", "username");
    res.status(200).json(collections);
  } catch (err) {
    console.error("❌ خطأ في جلب الكولكشنز:", err);
    res.status(500).json({ error: "فشل في جلب الكولكشنز", details: err.message });
  }
});

/* =====================================================
   ✅ جلب كولكشن واحد بالتفصيل (Admins فقط)
===================================================== */
router.get("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: "❌ الكولكشن غير موجود" });
    }
    res.status(200).json(collection);
  } catch (err) {
    console.error("❌ خطأ في جلب الكولكشن:", err);
    res.status(500).json({ error: "فشل في جلب الكولكشن", details: err.message });
  }
});

/* =====================================================
   🔒 إنشاء كولكشن جديد (Admins فقط)
===================================================== */
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, fields } = req.body;

    if (!name) {
      return res.status(400).json({ error: "❌ يجب إدخال اسم الكولكشن" });
    }

    const newCollection = await Collection.create({
      name,
      description,
      fields: fields || [], // ✅ يدعم حالة بدون حقول بالبداية
      createdBy: req.user.userId,
    });

    res.status(201).json({
      message: "✅ تم إنشاء الكولكشن بنجاح",
      collection: newCollection,
    });
  } catch (err) {
    console.error("❌ خطأ في إنشاء الكولكشن:", err);
    res.status(500).json({ error: "فشل في إنشاء الكولكشن", details: err.message });
  }
});

/* =====================================================
   ✏️ تعديل كولكشن أو إضافة/تحديث الحقول (Admins فقط)
===================================================== */
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, fields } = req.body;
    const updatedCollection = await Collection.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(description && { description }),
        ...(fields && { fields }), // ✅ يدعم تعديل الحقول بدون حذف القديمة
      },
      { new: true }
    );

    if (!updatedCollection) {
      return res.status(404).json({ message: "❌ الكولكشن غير موجود" });
    }

    res.status(200).json({
      message: "✅ تم تحديث الكولكشن بنجاح",
      collection: updatedCollection,
    });
  } catch (err) {
    console.error("❌ خطأ في تحديث الكولكشن:", err);
    res.status(500).json({ error: "فشل في تحديث الكولكشن", details: err.message });
  }
});

/* =====================================================
   🗑️ حذف كولكشن (Admins فقط)
===================================================== */
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const deletedCollection = await Collection.findByIdAndDelete(req.params.id);

    if (!deletedCollection) {
      return res.status(404).json({ message: "❌ الكولكشن غير موجود" });
    }

    res.json({ message: "✅ تم حذف الكولكشن بنجاح" });
  } catch (err) {
    console.error("❌ خطأ في حذف الكولكشن:", err);
    res.status(500).json({ error: "فشل في حذف الكولكشن", details: err.message });
  }
});

module.exports = router;
