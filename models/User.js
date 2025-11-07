const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
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

  // ✅ الصفحات المسموح للمستخدم يشوفها (Admins يشوفون الكل)
  allowedPages: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      default: [],
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
