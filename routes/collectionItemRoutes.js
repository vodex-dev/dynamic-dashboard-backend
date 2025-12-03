const express = require("express");
const router = express.Router();
const CollectionItem = require("../models/CollectionItem");
const Collection = require("../models/Collection");
const authMiddleware = require("../middleware/authMiddleware");

/* =====================================================
   ✅ إنشاء عنصر جديد داخل كولكشن (مستخدمين مسجلين)
===================================================== */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { collectionId, fields, data } = req.body;

    // ✅ تحقق من وجود الكولكشن
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ message: "❌ الكولكشن غير موجود" });
    }

    // ✅ استخدام fields إذا كان موجوداً، وإلا استخدم data
    const itemData = fields || data || {};

    // ✅ تحقق من أن البيانات موجودة
    if (!itemData || Object.keys(itemData).length === 0) {
      return res.status(400).json({ message: "❌ يجب إدخال بيانات على الأقل" });
    }

    // ✅ تحقق من أن كل الحقول المطلوبة موجودة (إذا كان collection.fields موجود)
    if (collection.fields && Array.isArray(collection.fields) && collection.fields.length > 0) {
      for (const field of collection.fields) {
        if (field.required && (itemData[field.name] === undefined || itemData[field.name] === "")) {
          return res.status(400).json({ message: `❌ الحقل "${field.name}" إجباري` });
        }
      }
    }

    const newItem = await CollectionItem.create({
      collectionId,
      data: itemData, // CollectionItem model يستخدم data
      createdBy: req.user.userId,
    });

    res.status(201).json({
      message: "✅ تم إنشاء المحتوى بنجاح",
      data: newItem,
    });
  } catch (err) {
    console.error("❌ خطأ في إنشاء العنصر:", err);
    res.status(500).json({ error: "فشل في إنشاء العنصر", details: err.message });
  }
});

/* =====================================================
   ✏️ تعديل عنصر داخل كولكشن (مستخدمين مسجلين)
===================================================== */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { data, fields } = req.body;

    // ✅ استخدام fields إذا كان موجوداً، وإلا استخدم data
    const itemData = fields || data || {};

    // ✅ تحقق من أن البيانات موجودة
    if (!itemData || Object.keys(itemData).length === 0) {
      return res.status(400).json({ message: "❌ يجب إدخال بيانات على الأقل" });
    }

    const updatedItem = await CollectionItem.findByIdAndUpdate(
      req.params.id,
      { data: itemData },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: "❌ العنصر غير موجود" });
    }

    res.status(200).json({
      message: "✅ تم تحديث العنصر بنجاح",
      data: updatedItem,
    });
  } catch (err) {
    console.error("❌ خطأ في تحديث العنصر:", err);
    res.status(500).json({ error: "فشل في تحديث العنصر", details: err.message });
  }
});

/* =====================================================
   🗑️ حذف عنصر (مستخدمين مسجلين)
===================================================== */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const itemId = req.params.id;
    console.log("🗑️ Attempting to delete item with ID:", itemId);
    
    const deletedItem = await CollectionItem.findByIdAndDelete(itemId);

    if (!deletedItem) {
      console.log("❌ Item not found:", itemId);
      return res.status(404).json({ message: "❌ العنصر غير موجود" });
    }

    console.log("✅ Item deleted successfully:", itemId);
    res.json({ message: "✅ تم حذف العنصر بنجاح" });
  } catch (err) {
    console.error("❌ خطأ في حذف العنصر:", err);
    res.status(500).json({ error: "فشل في حذف العنصر", details: err.message });
  }
});

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

module.exports = router;
