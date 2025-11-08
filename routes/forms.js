const express = require("express");
const router = express.Router();

const Form = require("../models/Form");
const FormField = require("../models/FormField");
const FormResponse = require("../models/FormResponse");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

/* ============================================================
   ✅ إنشاء فورم جديد (Admins فقط)
============================================================ */
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;

    const newForm = await Form.create({
      name,
      description,
      createdBy: req.user.userId,
    });

    res.status(201).json({
      message: "✅ تم إنشاء الفورم بنجاح",
      form: newForm,
    });
  } catch (err) {
    console.error("❌ خطأ في إنشاء الفورم:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📋 جلب جميع الفورمات (Admins فقط)
============================================================ */
router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const forms = await Form.find().populate("createdBy", "username");
    res.status(200).json(forms);
  } catch (err) {
    console.error("❌ خطأ في جلب الفورمات:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🧱 إضافة حقل جديد لفورم
============================================================ */
router.post("/:formId/fields", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, label, type, required, options, placeholder, order } = req.body;
    const { formId } = req.params;

    // تحقق من وجود الفورم
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ message: "❌ الفورم غير موجود" });
    }

    const newField = await FormField.create({
      formId,
      name,
      label,
      type,
      required,
      options,
      placeholder,
      order,
    });

    // أضف الحقل إلى الفورم
    form.fields.push(newField._id);
    await form.save();

    res.status(201).json({
      message: "✅ تم إضافة الحقل بنجاح",
      field: newField,
    });
  } catch (err) {
    console.error("❌ خطأ في إضافة الحقل:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📄 جلب جميع الحقول لفورم معيّن
============================================================ */
router.get("/:formId/fields", authMiddleware, async (req, res) => {
  try {
    const { formId } = req.params;
    const fields = await FormField.find({ formId }).sort({ order: 1 });
    res.status(200).json(fields);
  } catch (err) {
    console.error("❌ خطأ في جلب الحقول:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📬 استقبال الردود من المستخدمين (فرونت خارجي)
============================================================ */
router.post("/:formId/submit", async (req, res) => {
  try {
    const { formId } = req.params;
    const form = await Form.findById(formId).populate("fields");

    if (!form) {
      return res.status(404).json({ message: "❌ الفورم غير موجود" });
    }

    const userData = req.body;
    const validData = {};

    // تحقق من الحقول المسموحة فقط
    form.fields.forEach((field) => {
      if (userData[field.name] !== undefined) {
        validData[field.name] = userData[field.name];
      }
    });

    const newResponse = await FormResponse.create({
      formId,
      data: validData,
    });

    res.status(201).json({
      message: "✅ تم استلام الرد بنجاح",
      responseId: newResponse._id,
    });
  } catch (err) {
    console.error("❌ خطأ في إرسال الرد:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🗂️ جلب الردود الخاصة بفورم (Admins فقط)
============================================================ */
router.get("/:formId/responses", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { formId } = req.params;
    const responses = await FormResponse.find({ formId }).sort({ createdAt: -1 });
    res.status(200).json(responses);
  } catch (err) {
    console.error("❌ خطأ في جلب الردود:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
