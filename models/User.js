const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },

  // 🧩 الصفحات المسموحة للمستخدم (تُستخدم من قبل الـ Admins لتحديد الصلاحيات)
  allowedPages: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      default: [],
    },
  ],

  // 🧩 الكولكشنز المسموحة للمستخدم (نضيفها الآن لدعم صلاحيات Collections)
  collections: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      default: [],
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
