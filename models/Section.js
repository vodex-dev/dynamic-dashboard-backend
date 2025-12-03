const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  pageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Page",
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
});

module.exports = mongoose.model("Section", sectionSchema);
