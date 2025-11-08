const mongoose = require("mongoose");

const collectionItemSchema = new mongoose.Schema({
  collectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collection",
    required: true,
  },

  // ✅ البيانات الديناميكية حسب الحقول
  data: {
    type: mongoose.Schema.Types.Mixed, // خليها Mixed بدل Object للمرونة
    required: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// ✅ لتحديث الـ updatedAt تلقائياً عند التعديل
collectionItemSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("CollectionItem", collectionItemSchema);
