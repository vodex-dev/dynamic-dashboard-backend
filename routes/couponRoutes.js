const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

/* ============================================================
   ✅ التحقق من صحة الكوبون (للمستخدمين)
============================================================ */
router.post("/validate", authMiddleware, async (req, res) => {
  try {
    const { code, amount } = req.body;
    const userId = req.user.userId;

    if (!code) {
      return res.status(400).json({ error: "❌ يجب إدخال كود الكوبون" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "❌ يجب تحديد المبلغ" });
    }

    // البحث عن الكوبون
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({ error: "❌ كود الكوبون غير صحيح" });
    }

    // التحقق من صحة الكوبون
    const validation = coupon.isValid(userId);

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // التحقق من الحد الأدنى للمبلغ
    if (amount < coupon.minimumAmount) {
      return res.status(400).json({
        error: `❌ الحد الأدنى للاستخدام: ${coupon.minimumAmount} IQD`,
      });
    }

    // حساب الخصم
    const discount = coupon.calculateDiscount(amount);
    const finalAmount = Math.max(0, amount - discount);

    res.status(200).json({
      success: true,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount: discount,
        originalAmount: amount,
        finalAmount: finalAmount,
        description: coupon.description,
      },
    });
  } catch (err) {
    console.error("❌ خطأ في التحقق من الكوبون:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📋 جلب جميع الكوبونات (للأدمن)
============================================================ */
router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });

    res.status(200).json(coupons);
  } catch (err) {
    console.error("❌ خطأ في جلب الكوبونات:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📋 جلب كوبون واحد (للأدمن)
============================================================ */
router.get("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({ error: "❌ الكوبون غير موجود" });
    }

    res.status(200).json(coupon);
  } catch (err) {
    console.error("❌ خطأ في جلب الكوبون:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ➕ إنشاء كوبون جديد (للأدمن)
============================================================ */
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minimumAmount,
      maximumDiscount,
      startDate,
      endDate,
      usageLimit,
      description,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!code || !discountType || !discountValue || !startDate || !endDate) {
      return res.status(400).json({
        error: "❌ يجب إدخال: الكود، نوع الخصم، قيمة الخصم، تاريخ البداية والنهاية",
      });
    }

    // التحقق من نوع الخصم
    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({
        error: "❌ نوع الخصم يجب أن يكون: percentage أو fixed",
      });
    }

    // التحقق من القيم
    if (discountValue <= 0) {
      return res.status(400).json({ error: "❌ قيمة الخصم يجب أن تكون أكبر من صفر" });
    }

    if (discountType === "percentage" && discountValue > 100) {
      return res.status(400).json({ error: "❌ نسبة الخصم لا يمكن أن تتجاوز 100%" });
    }

    // التحقق من التواريخ
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        error: "❌ تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
      });
    }

    // إنشاء الكوبون
    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue,
      minimumAmount: minimumAmount || 0,
      maximumDiscount: maximumDiscount || null,
      startDate: start,
      endDate: end,
      usageLimit: usageLimit || null,
      description: description || "",
      isActive: true,
    });

    res.status(201).json({
      message: "✅ تم إنشاء الكوبون بنجاح",
      coupon,
    });
  } catch (err) {
    console.error("❌ خطأ في إنشاء الكوبون:", err);
    
    // معالجة خطأ duplicate key
    if (err.code === 11000) {
      return res.status(400).json({ error: "❌ كود الكوبون موجود مسبقاً" });
    }
    
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ✏️ تحديث كوبون (للأدمن)
============================================================ */
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minimumAmount,
      maximumDiscount,
      startDate,
      endDate,
      usageLimit,
      description,
      isActive,
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({ error: "❌ الكوبون غير موجود" });
    }

    // تحديث البيانات
    if (code !== undefined) coupon.code = code.toUpperCase().trim();
    if (discountType !== undefined) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = discountValue;
    if (minimumAmount !== undefined) coupon.minimumAmount = minimumAmount;
    if (maximumDiscount !== undefined) coupon.maximumDiscount = maximumDiscount;
    if (startDate !== undefined) coupon.startDate = new Date(startDate);
    if (endDate !== undefined) coupon.endDate = new Date(endDate);
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (description !== undefined) coupon.description = description;
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    res.status(200).json({
      message: "✅ تم تحديث الكوبون بنجاح",
      coupon,
    });
  } catch (err) {
    console.error("❌ خطأ في تحديث الكوبون:", err);
    
    if (err.code === 11000) {
      return res.status(400).json({ error: "❌ كود الكوبون موجود مسبقاً" });
    }
    
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🗑️ حذف كوبون (للأدمن)
============================================================ */
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({ error: "❌ الكوبون غير موجود" });
    }

    res.status(200).json({
      message: "✅ تم حذف الكوبون بنجاح",
    });
  } catch (err) {
    console.error("❌ خطأ في حذف الكوبون:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

