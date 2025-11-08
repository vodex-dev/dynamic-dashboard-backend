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

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "❌ المستخدم موجود بالفعل" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
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

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "❌ اسم المستخدم غير موجود" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "❌ كلمة المرور غير صحيحة" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

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
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const users = await User.find({}, { password: 0 });
    res.status(200).json({ data: users });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/* ============================================================
   📜 الصفحات المسموح بها (Pages)
============================================================ */
router.get("/users/:userId/pages", authMiddleware, async (req, res) => {
  try {
    const requesterId = req.user.userId || req.user.id;
    const targetId = req.params.userId;

    if (req.user.role !== "admin" && requesterId !== targetId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(targetId).populate("allowedPages", "name");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      data: user.allowedPages || [],
    });
  } catch (error) {
    console.error("❌ Error fetching user pages:", error);
    res.status(500).json({ message: "Failed to fetch user pages" });
  }
});

router.put("/users/:userId/pages", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { pageIds } = req.body;

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

/* ============================================================
   📦 الكولكشنز المسموح بها (Collections)
============================================================ */
router.get("/users/:userId/collections", authMiddleware, async (req, res) => {
  try {
    const requesterId = req.user.userId || req.user.id;
    const targetId = req.params.userId;

    if (req.user.role !== "admin" && requesterId !== targetId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(targetId).populate("collections", "name");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      data: user.collections || [],
    });
  } catch (error) {
    console.error("❌ Error fetching user collections:", error);
    res.status(500).json({ message: "Failed to fetch user collections" });
  }
});

router.put("/users/:userId/collections", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { collectionIds } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { collections: collectionIds },
      { new: true }
    ).populate("collections", "name");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "✅ User collections updated successfully",
      data: updatedUser.collections,
    });
  } catch (error) {
    console.error("❌ Error updating user collections:", error);
    res.status(500).json({ message: "Failed to update user collections" });
  }
});

/* ============================================================
   🧾 الفورمات المسموح بها (Forms)
============================================================ */
router.get("/users/:userId/forms", authMiddleware, async (req, res) => {
  try {
    const requesterId = req.user.userId || req.user.id;
    const targetId = req.params.userId;

    if (req.user.role !== "admin" && requesterId !== targetId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(targetId).populate("allowedForms", "name");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      data: user.allowedForms || [],
    });
  } catch (error) {
    console.error("❌ Error fetching user forms:", error);
    res.status(500).json({ message: "Failed to fetch user forms" });
  }
});

router.put("/users/:userId/forms", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { formIds } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { allowedForms: formIds },
      { new: true }
    ).populate("allowedForms", "name");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "✅ User forms updated successfully",
      data: updatedUser.allowedForms,
    });
  } catch (error) {
    console.error("❌ Error updating user forms:", error);
    res.status(500).json({ message: "Failed to update user forms" });
  }
});

module.exports = router;
