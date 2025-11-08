const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  description: {
    type: String,
    default: "",
  },

  // ✅ الحقول الديناميكية اللي الأدمن يقدر يضيفها بنفسه
  fields: [
    {
      name: { type: String, required: true, trim: true }, // اسم الحقل
      label: { type: String, default: "" }, // الاسم الظاهر (اختياري)
      type: {
        type: String,
        enum: ["text", "textarea", "number", "image", "boolean", "date"],
        default: "text",
      },
      required: { type: Boolean, default: false }, // هل هو إجباري
      defaultValue: { type: mongoose.Schema.Types.Mixed, default: "" }, // قيمة افتراضية
      placeholder: { type: String, default: "" }, // نص توضيحي
    },
  ],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Collection", collectionSchema);
