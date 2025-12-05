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
    // التحقق من متغيرات البيئة المطلوبة
    if (!process.env.CLOUDFLARE_R2_BUCKET) {
      console.error("❌ CLOUDFLARE_R2_BUCKET غير موجود في متغيرات البيئة");
      return res.status(500).json({ 
        error: "إعدادات Cloudflare R2 غير مكتملة", 
        details: "CLOUDFLARE_R2_BUCKET مفقود" 
      });
    }

    if (!process.env.CLOUDFLARE_R2_PUBLIC_URL) {
      console.error("❌ CLOUDFLARE_R2_PUBLIC_URL غير موجود في متغيرات البيئة");
      return res.status(500).json({ 
        error: "إعدادات Cloudflare R2 غير مكتملة", 
        details: "CLOUDFLARE_R2_PUBLIC_URL مفقود" 
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "❌ لا توجد صورة مرفوعة" });
    }

    // التحقق من نوع الملف
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: "❌ الملف المرفوع ليس صورة" });
    }

    const fileKey = `${uuidv4()}-${file.originalname}`;

    const params = {
      Bucket: process.env.CLOUDFLARE_R2_BUCKET,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    console.log("📤 محاولة رفع الصورة إلى Cloudflare R2:", {
      bucket: process.env.CLOUDFLARE_R2_BUCKET,
      key: fileKey,
      size: file.size,
      type: file.mimetype
    });

    // رفع الصورة إلى Cloudflare R2
    await s3.upload(params).promise();

    console.log("✅ تم رفع الصورة بنجاح إلى R2");

    // 🔗 استخدم رابط الـ Public Development URL
    const fileUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileKey}`;

    console.log("💾 حفظ معلومات الصورة في قاعدة البيانات");

    // حفظ معلومات الصورة في قاعدة البيانات
    const image = await Image.create({
      url: fileUrl,
      key: fileKey,
      uploadedBy: req.user.id,
      sectionId: req.body.sectionId || null,
    });

    console.log("✅ تم حفظ الصورة بنجاح:", image._id);

    res.status(201).json({
      message: "✅ تم رفع الصورة بنجاح",
      image,
    });
  } catch (err) {
    console.error("❌ خطأ في رفع الصورة:", err);
    console.error("❌ تفاصيل الخطأ:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode
    });
    
    // رسالة خطأ أوضح
    let errorMessage = "فشل في رفع الصورة";
    let errorDetails = err.message;

    // معالجة أخطاء محددة
    if (err.code === 'CredentialsError' || err.code === 'InvalidAccessKeyId') {
      errorMessage = "خطأ في بيانات اعتماد Cloudflare R2";
      errorDetails = "تحقق من CLOUDFLARE_ACCESS_KEY_ID و CLOUDFLARE_SECRET_ACCESS_KEY";
    } else if (err.code === 'NoSuchBucket') {
      errorMessage = "Bucket غير موجود في Cloudflare R2";
      errorDetails = "تحقق من CLOUDFLARE_R2_BUCKET";
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      errorMessage = "فشل الاتصال بـ Cloudflare R2";
      errorDetails = "تحقق من CLOUDFLARE_R2_ENDPOINT";
    }

    res.status(500).json({ 
      error: errorMessage, 
      details: errorDetails,
      code: err.code
    });
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
