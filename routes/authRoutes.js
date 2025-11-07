const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

/* ============================================================
   🧩 تسجيل مستخدم جديد (Register)
   ============================================================ */
router.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // 🔍 التحقق من وجود المستخدم مسبقًا
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "❌ المستخدم موجود بالفعل" });
    }

    // 🔒 تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🧱 إنشاء مستخدم جديد
    const user = new User({ username, password: hashedPassword, role });
    await user.save();

    res.status(201).json({ message: "✅ تم إنشاء المستخدم بنجاح" });
  } catch (err) {
    console.error("❌ خطأ في إنشاء المستخدم:", err);
    res.status(500).json({ message: "❌ خطأ في السيرفر" });
  }
});

/* ============================================================
   🔐 تسجيل الدخول (Login)
   ============================================================ */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 🔍 التحقق من وجود المستخدم
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "❌ اسم المستخدم غير موجود" });
    }

    // 🔑 مقارنة كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "❌ كلمة المرور غير صحيحة" });
    }

    // 🪪 إنشاء Token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🎉 إرسال الرد
    res.json({
      message: "✅ تسجيل الدخول ناجح",
      token,
      role: user.role,
    });
  } catch (err) {
    console.error("❌ خطأ في تسجيل الدخول:", err);
    res.status(500).json({ message: "❌ خطأ في السيرفر" });
  }
});

/* ============================================================
   👑 جلب جميع المستخدمين (Admins فقط)
   ============================================================ */
router.get("/users", authMiddleware, async (req, res) => {
  try {
    // 🔒 السماح فقط للإدمن
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // 📋 جلب جميع المستخدمين مع استبعاد كلمة المرور
    const users = await User.find({}, { password: 0 });

    res.status(200).json({ data: users });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/* ============================================================
   📜 جلب الصفحات المسموح بها لمستخدم معيّن
   (Admins أو المستخدم نفسه فقط)
   ============================================================ */
router.get("/users/:userId/pages", authMiddleware, async (req, res) => {
  try {
    // 🔒 السماح فقط للإدمن أو المستخدم نفسه
    if (req.user.role !== "admin" && req.user.id !== req.params.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // 🔍 جلب المستخدم مع الصفحات المسموحة
    const user = await User.findById(req.params.userId).populate("allowedPages", "name");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ data: user.allowedPages });
  } catch (error) {
    console.error("❌ Error fetching user pages:", error);
    res.status(500).json({ message: "Failed to fetch user pages" });
  }
});

/* ============================================================
   ✏️ تحديث الصفحات المسموح بها لمستخدم معيّن (Admins فقط)
   ============================================================ */
router.put("/users/:userId/pages", authMiddleware, async (req, res) => {
  try {
    // 🔒 السماح فقط للإدمن
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { pageIds } = req.body;

    // 🧱 تحديث الصفحات المسموح بها
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { allowedPages: pageIds },
      { new: true }
    ).populate("allowedPages", "name");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "✅ User pages updated successfully",
      data: updatedUser.allowedPages,
    });
  } catch (error) {
    console.error("❌ Error updating user pages:", error);
    res.status(500).json({ message: "Failed to update user pages" });
  }
});

module.exports = router;
