const express = require("express");
const router = express.Router();
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

/* ============================================================
   📋 جلب اشتراك المستخدم الحالي
============================================================ */
router.get("/my-subscription", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // جلب الاشتراك النشط للمستخدم
    const subscription = await Subscription.findOne({
      userId: userId,
      status: "active",
    })
      .populate("planId")
      .sort({ endDate: -1 });

    if (!subscription) {
      return res.status(200).json({
        hasSubscription: false,
        subscription: null,
      });
    }

    // التحقق من انتهاء الاشتراك
    const now = new Date();
    if (subscription.endDate < now && subscription.status === "active") {
      subscription.status = "expired";
      await subscription.save();
    }

    res.status(200).json({
      hasSubscription: true,
      subscription: subscription,
      isExpired: subscription.endDate < now,
    });
  } catch (err) {
    console.error("❌ خطأ في جلب الاشتراك:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ➕ الاشتراك في خطة
============================================================ */
router.post("/subscribe", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ message: "❌ يجب تحديد الخطة" });
    }

    // التحقق من وجود الخطة
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: "❌ الخطة غير موجودة أو غير نشطة" });
    }

    // إلغاء الاشتراك السابق إذا كان موجود
    await Subscription.updateMany(
      { userId: userId, status: "active" },
      { status: "cancelled" }
    );

    // حساب تاريخ الانتهاء (شهر واحد = 30 يوم)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    // إنشاء اشتراك جديد
    const subscription = new Subscription({
      userId: userId,
      planId: planId,
      startDate: startDate,
      endDate: endDate,
      status: "active",
    });

    await subscription.save();

    // تحديث المستخدم
    const user = await User.findById(userId);
    user.currentSubscription = subscription._id;
    await user.save();

    // Populate plan data
    await subscription.populate("planId");

    res.status(201).json({
      message: "✅ تم الاشتراك في الخطة بنجاح",
      subscription: subscription,
    });
  } catch (err) {
    console.error("❌ خطأ في الاشتراك:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🔄 تجديد الاشتراك
============================================================ */
router.post("/renew", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ message: "❌ يجب تحديد الخطة" });
    }

    // التحقق من وجود الخطة
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: "❌ الخطة غير موجودة أو غير نشطة" });
    }

    // جلب الاشتراك الحالي
    const currentSubscription = await Subscription.findOne({
      userId: userId,
      status: { $in: ["active", "expired"] },
    }).sort({ endDate: -1 });

    let startDate = new Date();
    let endDate = new Date();

    // إذا كان هناك اشتراك منتهي، نبدأ من اليوم
    // إذا كان هناك اشتراك نشط، نبدأ من تاريخ انتهائه
    if (currentSubscription && currentSubscription.status === "active") {
      startDate = currentSubscription.endDate;
      endDate = new Date(currentSubscription.endDate);
    }

    endDate.setDate(endDate.getDate() + plan.duration);

    // إنشاء اشتراك جديد أو تحديث الحالي
    let subscription;
    if (currentSubscription && currentSubscription.status === "active") {
      // تحديث الاشتراك الحالي
      currentSubscription.endDate = endDate;
      currentSubscription.planId = planId;
      await currentSubscription.save();
      subscription = currentSubscription;
    } else {
      // إلغاء الاشتراكات السابقة
      await Subscription.updateMany(
        { userId: userId, status: { $in: ["active", "expired"] } },
        { status: "cancelled" }
      );

      // إنشاء اشتراك جديد
      subscription = new Subscription({
        userId: userId,
        planId: planId,
        startDate: startDate,
        endDate: endDate,
        status: "active",
      });
      await subscription.save();
    }

    // تحديث المستخدم
    const user = await User.findById(userId);
    user.currentSubscription = subscription._id;
    await user.save();

    // Populate plan data
    await subscription.populate("planId");

    res.status(200).json({
      message: "✅ تم تجديد الاشتراك بنجاح",
      subscription: subscription,
    });
  } catch (err) {
    console.error("❌ خطأ في تجديد الاشتراك:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📋 جلب جميع اشتراكات المستخدم
============================================================ */
router.get("/my-subscriptions", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const subscriptions = await Subscription.find({ userId: userId })
      .populate("planId")
      .sort({ createdAt: -1 });

    res.status(200).json(subscriptions);
  } catch (err) {
    console.error("❌ خطأ في جلب الاشتراكات:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   👑 إعطاء اشتراك لمستخدم (Admin فقط)
============================================================ */
router.post("/assign", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId, planId } = req.body;

    if (!userId || !planId) {
      return res.status(400).json({ message: "❌ يجب تحديد المستخدم والخطة" });
    }

    // التحقق من وجود المستخدم
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "❌ المستخدم غير موجود" });
    }

    // التحقق من وجود الخطة
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: "❌ الخطة غير موجودة أو غير نشطة" });
    }

    // إلغاء الاشتراك السابق إذا كان موجود
    await Subscription.updateMany(
      { userId: userId, status: "active" },
      { status: "cancelled" }
    );

    // حساب تاريخ الانتهاء
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    // إنشاء اشتراك جديد
    const subscription = new Subscription({
      userId: userId,
      planId: planId,
      startDate: startDate,
      endDate: endDate,
      status: "active",
    });

    await subscription.save();

    // تحديث المستخدم
    user.currentSubscription = subscription._id;
    await user.save();

    // Populate plan data
    await subscription.populate("planId");

    res.status(201).json({
      message: "✅ تم إعطاء الاشتراك بنجاح",
      subscription: subscription,
    });
  } catch (err) {
    console.error("❌ خطأ في إعطاء الاشتراك:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🚫 إلغاء/حذف اشتراك لمستخدم (Admin فقط)
============================================================ */
router.delete("/user/:userId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { deletePermanently } = req.query; // ?deletePermanently=true لحذف نهائي

    // التحقق من وجود المستخدم
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "❌ المستخدم غير موجود" });
    }

    if (deletePermanently === 'true') {
      // حذف نهائي لجميع الاشتراكات
      const deletedCount = await Subscription.deleteMany({ userId: userId });
      
      // إزالة الاشتراك من المستخدم
      user.currentSubscription = null;
      await user.save();

      res.status(200).json({
        message: "✅ تم حذف جميع الاشتراكات نهائياً",
        deletedCount: deletedCount.deletedCount,
      });
    } else {
      // إلغاء الاشتراكات النشطة فقط
      const result = await Subscription.updateMany(
        { userId: userId, status: "active" },
        { status: "cancelled" }
      );

      // إزالة الاشتراك من المستخدم
      user.currentSubscription = null;
      await user.save();

      res.status(200).json({
        message: "✅ تم إلغاء الاشتراك بنجاح",
        cancelledCount: result.modifiedCount,
      });
    }
  } catch (err) {
    console.error("❌ خطأ في إلغاء/حذف الاشتراك:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📋 جلب جميع اشتراكات مستخدم معين (Admin فقط)
============================================================ */
router.get("/user/:userId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;

    const subscriptions = await Subscription.find({ userId: userId })
      .populate("planId")
      .sort({ createdAt: -1 });

    res.status(200).json(subscriptions);
  } catch (err) {
    console.error("❌ خطأ في جلب اشتراكات المستخدم:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ✏️ تحديث تاريخ بداية ونهاية الاشتراك (Admin فقط)
============================================================ */
router.put("/subscription/:subscriptionId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { startDate, endDate } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ message: "❌ الاشتراك غير موجود" });
    }

    // تحديث التواريخ إذا تم إرسالها
    if (startDate) {
      subscription.startDate = new Date(startDate);
    }
    if (endDate) {
      subscription.endDate = new Date(endDate);
    }

    // التحقق من أن تاريخ النهاية بعد تاريخ البداية
    if (subscription.endDate < subscription.startDate) {
      return res.status(400).json({ message: "❌ تاريخ النهاية يجب أن يكون بعد تاريخ البداية" });
    }

    await subscription.save();
    await subscription.populate("planId");

    res.status(200).json({
      message: "✅ تم تحديث الاشتراك بنجاح",
      subscription: subscription,
    });
  } catch (err) {
    console.error("❌ خطأ في تحديث الاشتراك:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🗑️ حذف/إلغاء اشتراك محدد (Admin فقط)
============================================================ */
router.delete("/subscription/:subscriptionId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { deletePermanently } = req.query; // ?deletePermanently=true لحذف نهائي

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ message: "❌ الاشتراك غير موجود" });
    }

    const userId = subscription.userId;

    if (deletePermanently === 'true') {
      // حذف نهائي
      await Subscription.findByIdAndDelete(subscriptionId);
      
      // التحقق من أن هذا الاشتراك هو الحالي للمستخدم
      const user = await User.findById(userId);
      if (user && user.currentSubscription && user.currentSubscription.toString() === subscriptionId) {
        user.currentSubscription = null;
        await user.save();
      }

      res.status(200).json({
        message: "✅ تم حذف الاشتراك نهائياً",
      });
    } else {
      // إلغاء الاشتراك (تغيير status إلى cancelled)
      subscription.status = "cancelled";
      await subscription.save();

      // التحقق من أن هذا الاشتراك هو الحالي للمستخدم
      const user = await User.findById(userId);
      if (user && user.currentSubscription && user.currentSubscription.toString() === subscriptionId) {
        user.currentSubscription = null;
        await user.save();
      }

      res.status(200).json({
        message: "✅ تم إلغاء الاشتراك بنجاح",
        subscription: subscription,
      });
    }
  } catch (err) {
    console.error("❌ خطأ في حذف/إلغاء الاشتراك:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

