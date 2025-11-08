const express = require("express");
const router = express.Router();
const CollectionItem = require("../models/CollectionItem");
const Collection = require("../models/Collection");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

/* =====================================================
   ✅ جلب كل العناصر داخل كولكشن محدد (مفتوح للجميع)
===================================================== */
router.get("/:collectionId", async (req, res) => {
  try {
    const items = await CollectionItem.find({ collectionId: req.params.collectionId })
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    res.status(200).json(items);
  } catch (err) {
    console.error("❌ خطأ في جلب العناصر:", err);
    res.status(500).json({ error: "فشل في جلب العناصر", details: err.message });
  }
});

/* =====================================================
   🔒 إنشاء عنصر جديد داخل كولكشن (Admins فقط)
===================================================== */
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { collectionId, data } = req.body;

    // ✅ تحقق من وجود الكولكشن
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ message: "❌ الكولكشن غير موجود" });
    }

    // ✅ تحقق من أن كل الحقول المطلوبة موجودة
    for (const field of collection.fields) {
      if (field.required && (data[field.name] === undefined || data[field.name] === "")) {
        return res.status(400).json({ message: `❌ الحقل "${field.name}" إجباري` });
      }
    }

    const newItem = await CollectionItem.create({
      collectionId,
      data,
      createdBy: req.user.userId,
    });

    res.status(201).json({
      message: "✅ تم إنشاء المحتوى بنجاح",
      item: newItem,
    });
  } catch (err) {
    console.error("❌ خطأ في إنشاء العنصر:", err);
    res.status(500).json({ error: "فشل في إنشاء العنصر", details: err.message });
  }
});

/* =====================================================
   ✏️ تعديل عنصر داخل كولكشن (Admins فقط)
===================================================== */
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { data } = req.body;

    const updatedItem = await CollectionItem.findByIdAndUpdate(
      req.params.id,
      { data },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: "❌ العنصر غير موجود" });
    }

    res.status(200).json({
      message: "✅ تم تحديث العنصر بنجاح",
      item: updatedItem,
    });
  } catch (err) {
    console.error("❌ خطأ في تحديث العنصر:", err);
    res.status(500).json({ error: "فشل في تحديث العنصر", details: err.message });
  }
});

/* =====================================================
   🗑️ حذف عنصر (Admins فقط)
===================================================== */
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const deletedItem = await CollectionItem.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({ message: "❌ العنصر غير موجود" });
    }

    res.json({ message: "✅ تم حذف العنصر بنجاح" });
  } catch (err) {
    console.error("❌ خطأ في حذف العنصر:", err);
    res.status(500).json({ error: "فشل في حذف العنصر", details: err.message });
  }
});

module.exports = router;
