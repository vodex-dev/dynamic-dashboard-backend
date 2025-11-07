const express = require("express");
const router = express.Router();
const Page = require("../models/Page");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ جلب جميع الصفحات
router.get("/", authMiddleware, async (req, res) => {
  try {
    const pages = await Page.find();
    res.status(200).json(pages);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ إنشاء صفحة جديدة (Admins فقط)
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { name } = req.body;
    const newPage = new Page({ name, createdBy: req.user.id });
    await newPage.save();

    res.status(201).json(newPage);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ تحديث صفحة
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updatedPage = await Page.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );

    res.status(200).json(updatedPage);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ حذف صفحة
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Page.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Page deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
