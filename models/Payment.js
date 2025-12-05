const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  // Sindipay Payment ID
  paymentId: {
    type: Number,
    required: true,
    unique: true,
  },
  
  // Order ID (unique reference)
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  
  // Related subscription
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
    default: null,
  },
  
  // Related plan
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan",
    required: true,
  },
  
  // User who made the payment
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  
  // Payment details
  title: {
    type: String,
    required: true,
  },
  
  totalAmount: {
    type: String,
    required: true,
  },
  
  currency: {
    type: String,
    enum: ["IQD"],
    default: "IQD",
  },
  
  // Payment URL from Sindipay
  paymentUrl: {
    type: String,
    required: true,
  },
  
  // Status from Sindipay
  status: {
    type: String,
    enum: ["CREATED", "PAID", "FAILED", "DECLINED", "EXPIRED", "CANCELLED"],
    default: "CREATED",
  },
  
  // URLs
  callbackUrl: {
    type: String,
    required: true,
  },
  
  webhookUrl: {
    type: String,
    default: null,
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  
  // Webhook received
  webhookReceived: {
    type: Boolean,
    default: false,
  },
  
  webhookReceivedAt: {
    type: Date,
    default: null,
  },
  
  // Payment completed
  paidAt: {
    type: Date,
    default: null,
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

// Indexes
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ subscriptionId: 1 });

// Update updatedAt before saving
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);

