const express = require("express");
const router = express.Router();
const Plan = require("../models/Plan");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

/* ============================================================
   📋 جلب جميع الخطط (للجميع)
============================================================ */
router.get("/", async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
    res.status(200).json(plans);
  } catch (err) {
    console.error("❌ خطأ في جلب الخطط:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📋 جلب خطة واحدة
============================================================ */
router.get("/:planId", async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.planId);
    if (!plan) {
      return res.status(404).json({ message: "❌ الخطة غير موجودة" });
    }
    res.status(200).json(plan);
  } catch (err) {
    console.error("❌ خطأ في جلب الخطة:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ➕ إنشاء خطة جديدة (Admin فقط)
============================================================ */
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, price, duration, features } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: "❌ يجب إدخال اسم الخطة والسعر" });
    }

    const plan = new Plan({
      name,
      description,
      price,
      duration: duration || 30,
      features: features || [],
    });

    await plan.save();
    res.status(201).json({
      message: "✅ تم إنشاء الخطة بنجاح",
      plan: plan,
    });
  } catch (err) {
    console.error("❌ خطأ في إنشاء الخطة:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ✏️ تحديث خطة (Admin فقط)
============================================================ */
router.put("/:planId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, price, duration, features, isActive } = req.body;

    const plan = await Plan.findById(req.params.planId);
    if (!plan) {
      return res.status(404).json({ message: "❌ الخطة غير موجودة" });
    }

    if (name) plan.name = name;
    if (description !== undefined) plan.description = description;
    if (price !== undefined) plan.price = price;
    if (duration !== undefined) plan.duration = duration;
    if (features !== undefined) plan.features = features;
    if (isActive !== undefined) plan.isActive = isActive;

    await plan.save();
    res.status(200).json({
      message: "✅ تم تحديث الخطة بنجاح",
      plan: plan,
    });
  } catch (err) {
    console.error("❌ خطأ في تحديث الخطة:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🗑️ حذف خطة (Admin فقط)
============================================================ */
router.delete("/:planId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.planId);
    if (!plan) {
      return res.status(404).json({ message: "❌ الخطة غير موجودة" });
    }
    res.status(200).json({ message: "✅ تم حذف الخطة بنجاح" });
  } catch (err) {
    console.error("❌ خطأ في حذف الخطة:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


