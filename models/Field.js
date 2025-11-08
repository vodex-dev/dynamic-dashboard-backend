const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema({
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["text", "textarea", "number", "image"],
    default: "text",
  },
  content: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("Field", fieldSchema);
