const express = require("express");
const router = express.Router();
const Section = require("../models/Section");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, pageId } = req.body;

    if (!name || !pageId) {
      return res
        .status(400)
        .json({ error: "يجب إدخال name و pageId كلاهما" });
    }

    const newSection = await Section.create({
      name,
      pageId,
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: "✅ تم إنشاء السكشن بنجاح",
      section: newSection,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "حدث خطأ في السيرفر ❌",
      details: err.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const sections = await Section.find();
    res.json(sections);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "حدث خطأ في السيرفر ❌",
      details: err.message,
    });
  }
});

module.exports = router;
