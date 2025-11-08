// routes/collectionUploadRoutes.js
const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const s3 = require("../utils/r2");
const Image = require("../models/Image");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ رفع صورة جديدة تابعة لـ CollectionItem
router.post("/", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const { collectionItemId } = req.body;

    if (!file) return res.status(400).json({ error: "❌ لا توجد صورة مرفوعة" });
    if (!collectionItemId) return res.status(400).json({ error: "❌ collectionItemId مفقود" });

    const fileKey = `${uuidv4()}-${file.originalname}`;

    const params = {
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.upload(params).promise();

    const fileUrl = `${process.env.CLOUDFLARE_R2_ENDPOINT}/${process.env.CLOUDFLARE_R2_BUCKET}/${fileKey}`;

    const image = await Image.create({
      url: fileUrl,
      key: fileKey,
      uploadedBy: req.user.id,
      collectionItemId,
    });

    res.status(201).json({
      message: "✅ تم رفع الصورة الخاصة بالكولكشن بنجاح",
      image,
    });
  } catch (err) {
    console.error("❌ خطأ في رفع الصورة:", err);
    res.status(500).json({ error: "فشل في رفع الصورة", details: err.message });
  }
});

// 🗑️ حذف صورة من R2 خاصة بالكولكشن
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) return res.status(404).json({ error: "❌ الصورة غير موجودة" });

    await s3
      .deleteObject({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET,
        Key: image.key,
      })
      .promise();

    await image.deleteOne();
    res.status(200).json({ message: "🗑️ تم حذف الصورة بنجاح" });
  } catch (err) {
    console.error("❌ خطأ في حذف الصورة:", err);
    res.status(500).json({ error: "فشل في حذف الصورة", details: err.message });
  }
});

module.exports = router;
