const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 🧩 تسجيل مستخدم جديد
router.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // التحقق من وجود المستخدم مسبقًا
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "❌ المستخدم موجود بالفعل" });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إنشاء المستخدم
    const user = new User({ username, password: hashedPassword, role });
    await user.save();

    res.status(201).json({ message: "✅ تم إنشاء المستخدم بنجاح" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ خطأ في السيرفر" });
  }
});

// 🔐 تسجيل الدخول
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "❌ اسم المستخدم غير موجود" });
    }

    // مقارنة كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "❌ كلمة المرور غير صحيحة" });
    }

    // إنشاء token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ message: "✅ تسجيل الدخول ناجح", token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ خطأ في السيرفر" });
  }
});

module.exports = router;
