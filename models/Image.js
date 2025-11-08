const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  url: { 
    type: String, 
    required: true 
  }, // 🔗 رابط الصورة على Cloudflare R2

  key: { 
    type: String, 
    required: true 
  }, // 🗝️ اسم الملف داخل R2 (للحذف لاحقًا)

  // الصورة ممكن تكون تابعة لسكشن أو عنصر كولكشن
  sectionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Section", 
    default: null 
  },

  collectionItemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "CollectionItem", 
    default: null 
  },

  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  uploadedAt: { 
    type: Date, 
    default: Date.now 
  },
});

module.exports = mongoose.model("Image", ImageSchema);
