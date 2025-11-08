const mongoose = require("mongoose");

const formSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  fields: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormField",
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // الأدمن اللي أنشأ الفورم
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Form", formSchema);
