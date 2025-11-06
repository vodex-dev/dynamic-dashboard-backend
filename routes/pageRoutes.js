const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

// 🧱 صفحة عامة
router.get("/public", (req, res) => {
  res.json({ message: "🌍 صفحة عامة - متاحة للجميع" });
});

// 🔐 صفحة خاصة للمستخدمين المسجلين
router.get("/private", authMiddleware, (req, res) => {
  res.json({ message: `🔒 أهلاً ${req.user.role}، هذه صفحة خاصة` });
});

// 👑 صفحة خاصة للأدمن فقط
router.get("/admin", authMiddleware, adminOnly, (req, res) => {
  res.json({ message: "👑 أهلاً أدمن، عندك صلاحية كاملة" });
});

module.exports = router;
