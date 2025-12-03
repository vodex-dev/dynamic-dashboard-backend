const mongoose = require("mongoose");

const formFieldSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Form",
    required: true,
  },
  name: {
    type: String,
    required: true, // الاسم البرمجي (مثلاً: "email")
    trim: true,
  },
  label: {
    type: String,
    required: true, // الاسم الظاهر للمستخدم (مثلاً: "البريد الإلكتروني")
  },
  type: {
    type: String,
    enum: ["text", "number", "email", "textarea", "select", "radio", "checkbox", "date", "file"],
    default: "text",
  },
  required: {
    type: Boolean,
    default: false,
  },
  options: [
    {
      type: String, // لو نوع الحقل select أو radio
    },
  ],
  placeholder: {
    type: String,
    default: "",
  },
  order: {
    type: Number, // لترتيب الحقول
    default: 0,
  },
});

module.exports = mongoose.model("FormField", formFieldSchema);
