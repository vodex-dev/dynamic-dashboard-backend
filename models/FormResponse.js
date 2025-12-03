const mongoose = require("mongoose");

const formResponseSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Form",
    required: true,
  },
  data: {
    type: Object, // راح يخزن القيم مثل { name: "Ali", email: "ali@example.com" }
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  editedAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model("FormResponse", formResponseSchema);
