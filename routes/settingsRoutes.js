const express = require("express");
const router = express.Router();
const Settings = require("../models/Settings");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

// GET /api/settings/tutorial-video - جلب رابط الفيديو التعليمي (للمستخدمين)
router.get("/tutorial-video", authMiddleware, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: "tutorial_video_url" });
    
    if (!setting) {
      return res.status(200).json({
        url: "",
        exists: false,
      });
    }

    res.status(200).json({
      url: setting.value || "",
      exists: true,
    });
  } catch (err) {
    console.error("❌ خطأ في جلب رابط الفيديو التعليمي:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/tutorial-video - تحديث رابط الفيديو التعليمي (Admin فقط)
router.put("/tutorial-video", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string" || url.trim() === "") {
      return res.status(400).json({ error: "رابط الفيديو مطلوب" });
    }

    // التحقق من أن الرابط صحيح (يبدأ بـ http:// أو https://)
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(url.trim())) {
      return res.status(400).json({ error: "رابط الفيديو غير صحيح. يجب أن يبدأ بـ http:// أو https://" });
    }

    const setting = await Settings.findOneAndUpdate(
      { key: "tutorial_video_url" },
      {
        value: url.trim(),
        updatedBy: req.user.id,
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.status(200).json({
      message: "✅ تم تحديث رابط الفيديو التعليمي بنجاح",
      setting: {
        key: setting.key,
        value: setting.value,
        updatedAt: setting.updatedAt,
      },
    });
  } catch (err) {
    console.error("❌ خطأ في تحديث رابط الفيديو التعليمي:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

