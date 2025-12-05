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

  // 🧩 الكولكشنز المسموحة للمستخدم (صلاحيات Collections)
  collections: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      default: [],
    },
  ],

  // 🧩 الفورمات المسموحة للمستخدم (صلاحيات Forms)
  allowedForms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      default: [],
    },
  ],

  // 🎯 الاشتراك الحالي للمستخدم
  currentSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
    default: null,
  },

  // 🚫 حالة الحساب (معلق أم لا)
  isSuspended: {
    type: Boolean,
    default: false,
  },

  // 📝 تاريخ آخر تغيير لكلمة المرور
  lastPasswordChange: {
    type: Date,
    default: null,
  },

  // 📜 سجل تغييرات كلمة المرور
  passwordHistory: [
    {
      changedAt: {
        type: Date,
        default: Date.now,
      },
      changedBy: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
      },
    },
  ],

  // 🔑 كلمة المرور المؤقتة (للعرض عند الإنشاء فقط)
  tempPassword: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("User", userSchema);
