const express = require("express");
const router = express.Router();

const Form = require("../models/Form");
const FormField = require("../models/FormField");
const FormResponse = require("../models/FormResponse");
const User = require("../models/User"); // ✅ لدعم صلاحيات الفورمات
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");

/* ============================================================
   🧩 إنشاء فورم جديد (Admins فقط)
============================================================ */
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "❌ يجب إدخال اسم الفورم" });
    }

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
   📋 جلب جميع الفورمات
   - Admin: يشوف الكل
   - User: يشوف فقط الفورمات المسموحة له
============================================================ */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    if (user.role === "admin") {
      // ✅ الأدمن يشوف كل الفورمات
      const forms = await Form.find().populate("createdBy", "username");
      return res.status(200).json(forms);
    }

    // ✅ المستخدم العادي يشوف فقط الفورمات المسموحة له
    const userDoc = await User.findById(user.userId).populate("allowedForms", "name");
    if (!userDoc) {
      return res.status(404).json({ message: "❌ المستخدم غير موجود" });
    }

    const allowedFormIds = userDoc.allowedForms.map((f) => f._id);
    if (allowedFormIds.length === 0) {
      return res.status(200).json([]); // ما عنده صلاحيات
    }

    const forms = await Form.find({ _id: { $in: allowedFormIds } });
    res.status(200).json(forms);
  } catch (err) {
    console.error("❌ خطأ في جلب الفورمات:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🧱 إضافة حقل جديد لفورم (Admins فقط)
============================================================ */
router.post("/:formId/fields", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, label, type, required, options, placeholder, order } = req.body;
    const { formId } = req.params;

    // ✅ تحقق من وجود الفورم
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

    // ✅ تحقق من الصلاحية (إذا مو أدمن)
    if (req.user.role !== "admin") {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "❌ المستخدم غير موجود" });
      }

      const hasAccess = user.allowedForms.some(
        (form) => form.toString() === formId
      );
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "❌ لا تملك صلاحية عرض هذا الفورم" });
      }
    }

    const fields = await FormField.find({ formId }).sort({ order: 1 });
    res.status(200).json(fields);
  } catch (err) {
    console.error("❌ خطأ في جلب الحقول:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📬 استقبال الردود من المستخدمين (واجهة عامة)
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

    // ✅ تحقق من الحقول المسموحة فقط
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
   ✏️ تحديث رد من الفورم
   يجب أن يكون قبل route جلب الردود لتجنب التعارض
============================================================ */
router.put("/:formId/responses/:responseId", authMiddleware, async (req, res) => {
  try {
    const { formId, responseId } = req.params;
    const user = req.user;
    const { data } = req.body;

    console.log("📝 PUT /:formId/responses/:responseId", {
      formId,
      responseId,
      formIdType: typeof formId,
      responseIdType: typeof responseId,
      userId: user?.userId,
      userRole: user?.role,
      data: data,
      body: req.body,
      params: req.params
    });

    // ✅ تحقق من وجود الرد
    const response = await FormResponse.findById(responseId);
    if (!response) {
      console.log("❌ Response not found:", responseId);
      return res.status(404).json({ message: "❌ الرد غير موجود" });
    }

    // ✅ تحقق من أن الرد ينتمي للفورم المحدد
    if (response.formId.toString() !== formId) {
      console.log("❌ Response doesn't belong to form:", {
        responseFormId: response.formId.toString(),
        requestedFormId: formId
      });
      return res.status(400).json({ message: "❌ الرد لا ينتمي لهذا الفورم" });
    }

    // ✅ تحديث البيانات
    if (data) {
      response.data = data;
    }
    response.editedBy = user.userId;
    response.editedAt = new Date();

    await response.save();

    // Populate editedBy to get user info
    await response.populate('editedBy', 'name username email');

    console.log("✅ Response updated successfully");

    res.status(200).json({
      message: "✅ تم تحديث الرد بنجاح",
      response: response,
    });
  } catch (err) {
    console.error("❌ خطأ في تحديث الرد:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🗑️ حذف رد من الفورم
============================================================ */
router.delete("/:formId/responses/:responseId", authMiddleware, async (req, res) => {
  try {
    const { formId, responseId } = req.params;

    // ✅ تحقق من وجود الرد
    const response = await FormResponse.findById(responseId);
    if (!response) {
      return res.status(404).json({ message: "❌ الرد غير موجود" });
    }

    // ✅ تحقق من أن الرد ينتمي للفورم المحدد
    if (response.formId.toString() !== formId) {
      return res.status(400).json({ message: "❌ الرد لا ينتمي لهذا الفورم" });
    }

    await FormResponse.findByIdAndDelete(responseId);

    res.status(200).json({
      message: "✅ تم حذف الرد بنجاح",
    });
  } catch (err) {
    console.error("❌ خطأ في حذف الرد:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🗂️ جلب الردود الخاصة بفورم
   - Admin: يشوف كل الردود
   - User: يشوف فقط الفورمات المسموحة له
   يجب أن يكون بعد routes التحديث والحذف
============================================================ */
router.get("/:formId/responses", authMiddleware, async (req, res) => {
  try {
    const { formId } = req.params;
    const user = req.user;

    // ✅ تحقق من وجود الفورم
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ message: "❌ الفورم غير موجود" });
    }

    // ✅ الأدمن يشوف كل الردود
    if (user.role === "admin") {
      const responses = await FormResponse.find({ formId })
        .populate('editedBy', 'name username email')
        .sort({
          createdAt: -1,
        });
      return res.status(200).json(responses);
    }

    // ✅ المستخدم العادي → تحقق من الصلاحية
    const userDoc = await User.findById(user.userId);
    if (!userDoc) {
      return res.status(404).json({ message: "❌ المستخدم غير موجود" });
    }

    const allowedFormIds = userDoc.allowedForms || [];
    const formIdStr = formId.toString();
    const isAllowed = allowedFormIds.some((id) => {
      const idStr = (id._id || id).toString();
      return idStr === formIdStr;
    });

    if (!isAllowed) {
      return res.status(403).json({
        message: "🚫 لا تملك صلاحية لعرض الردود لهذا الفورم",
      });
    }

    // ✅ جلب الردود للفورم المسموح به
    const responses = await FormResponse.find({ formId })
      .populate('editedBy', 'name username email')
      .sort({
        createdAt: -1,
      });
    res.status(200).json(responses);
  } catch (err) {
    console.error("❌ خطأ في جلب الردود:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
