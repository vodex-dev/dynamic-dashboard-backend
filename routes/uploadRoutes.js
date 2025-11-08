const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { s3, PUBLIC_R2_URL } = require("../utils/r2");
const Image = require("../models/Image");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ رفع صورة جديدة إلى Cloudflare R2
router.post("/", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "❌ لا توجد صورة مرفوعة" });

    const fileKey = `${uuidv4()}-${file.originalname}`;

    const params = {
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.upload(params).promise();

    // 🔗 استخدم رابط الـ Public Development URL بدلاً من الـ private
    const fileUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileKey}`;


    // حفظ معلومات الصورة في قاعدة البيانات
    const image = await Image.create({
      url: fileUrl,
      key: fileKey,
      uploadedBy: req.user.id,
      sectionId: req.body.sectionId || null,
    });

    res.status(201).json({
      message: "✅ تم رفع الصورة بنجاح",
      image,
    });
  } catch (err) {
    console.error("❌ خطأ في رفع الصورة:", err);
    res.status(500).json({ error: "فشل في رفع الصورة", details: err.message });
  }
});

// 🧹 حذف صورة من R2
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
