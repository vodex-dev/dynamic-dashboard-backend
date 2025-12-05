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

/* ============================================================
   📢 إعدادات الإشعارات - جلب الإعدادات (للأدمن)
============================================================ */
router.get("/subscription-notification", authMiddleware, adminOnly, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: "subscription_notification_settings" });
    
    if (!setting) {
      // Default settings
      const defaultSettings = {
        enabled: true,
        warningDaysBeforeExpiry: 2, // أيام قبل انتهاء الاشتراك
        generalMessage: "Your subscription will expire soon. Please renew to continue using the service.",
        freeUserMessage: "You are a free user. Subscribe to unlock all features.",
        targetUsers: "all", // "all" or "specific"
        specificUserIds: [],
      };
      
      return res.status(200).json({
        settings: defaultSettings,
        exists: false,
      });
    }

    const settings = typeof setting.value === 'string' 
      ? JSON.parse(setting.value) 
      : setting.value;

    res.status(200).json({
      settings: settings,
      exists: true,
    });
  } catch (err) {
    console.error("❌ خطأ في جلب إعدادات الإشعارات:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📢 إعدادات الإشعارات - تحديث الإعدادات (Admin فقط)
============================================================ */
router.put("/subscription-notification", authMiddleware, adminOnly, async (req, res) => {
  try {
    const {
      enabled,
      warningDaysBeforeExpiry,
      generalMessage,
      freeUserMessage,
      targetUsers,
      specificUserIds,
    } = req.body;

    const settings = {
      enabled: enabled !== undefined ? enabled : true,
      warningDaysBeforeExpiry: warningDaysBeforeExpiry || 2,
      generalMessage: generalMessage || "Your subscription will expire soon. Please renew to continue using the service.",
      freeUserMessage: freeUserMessage || "You are a free user. Subscribe to unlock all features.",
      targetUsers: targetUsers || "all", // "all" or "specific"
      specificUserIds: Array.isArray(specificUserIds) ? specificUserIds : [],
    };

    const setting = await Settings.findOneAndUpdate(
      { key: "subscription_notification_settings" },
      {
        value: settings,
        updatedBy: req.user.userId || req.user.id,
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.status(200).json({
      message: "✅ تم تحديث إعدادات الإشعارات بنجاح",
      settings: setting.value,
    });
  } catch (err) {
    console.error("❌ خطأ في تحديث إعدادات الإشعارات:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📢 جلب إعدادات الإشعارات للمستخدم (للتحقق من الإشعار)
============================================================ */
router.get("/subscription-notification/user", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const setting = await Settings.findOne({ key: "subscription_notification_settings" });
    
    if (!setting) {
      return res.status(200).json({
        settings: null,
        shouldShow: false,
      });
    }

    const settings = typeof setting.value === 'string' 
      ? JSON.parse(setting.value) 
      : setting.value;

    // Check if user should see notification
    let shouldShow = false;
    if (settings.enabled) {
      if (settings.targetUsers === "all") {
        shouldShow = true;
      } else if (settings.targetUsers === "specific") {
        const userIdStr = userId.toString();
        const specificIds = settings.specificUserIds || [];
        shouldShow = specificIds.some(id => id.toString() === userIdStr);
      }
    }

    res.status(200).json({
      settings: settings,
      shouldShow: shouldShow,
    });
  } catch (err) {
    console.error("❌ خطأ في جلب إعدادات الإشعارات للمستخدم:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

