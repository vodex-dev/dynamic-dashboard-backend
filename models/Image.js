const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  url: { type: String, required: true }, // رابط الصورة على Cloudflare
  key: { type: String, required: true }, // اسم الصورة داخل R2
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section" }, // الصورة تخص سكشن معين
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // المستخدم اللي رفعها
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Image", ImageSchema);
