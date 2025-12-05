const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  // كود الكوبون
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  
  // نوع الخصم (percentage أو fixed)
  discountType: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true,
  },
  
  // قيمة الخصم
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // الحد الأدنى للمبلغ (اختياري)
  minimumAmount: {
    type: Number,
    default: 0,
  },
  
  // الحد الأقصى للخصم (للكوبونات النسبية)
  maximumDiscount: {
    type: Number,
    default: null,
  },
  
  // تاريخ البداية
  startDate: {
    type: Date,
    required: true,
  },
  
  // تاريخ النهاية
  endDate: {
    type: Date,
    required: true,
  },
  
  // عدد مرات الاستخدام
  usageLimit: {
    type: Number,
    default: null, // null = unlimited
  },
  
  // عدد مرات الاستخدام الحالية
  usedCount: {
    type: Number,
    default: 0,
  },
  
  // حالة الكوبون
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // المستخدمون الذين استخدموا الكوبون
  usedBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      usedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  
  // وصف الكوبون
  description: {
    type: String,
    trim: true,
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
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1 });
couponSchema.index({ startDate: 1, endDate: 1 });

// Update updatedAt before saving
couponSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if coupon is valid
couponSchema.methods.isValid = function(userId = null) {
  const now = new Date();
  
  // Check if active
  if (!this.isActive) {
    return { valid: false, error: "Coupon is not active" };
  }
  
  // Check date range
  if (now < this.startDate) {
    return { valid: false, error: "Coupon has not started yet" };
  }
  
  if (now > this.endDate) {
    return { valid: false, error: "Coupon has expired" };
  }
  
  // Check usage limit
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return { valid: false, error: "Coupon usage limit reached" };
  }
  
  // Check if user already used this coupon
  if (userId) {
    const userUsed = this.usedBy.some(
      (usage) => usage.userId.toString() === userId.toString()
    );
    if (userUsed) {
      return { valid: false, error: "You have already used this coupon" };
    }
  }
  
  return { valid: true };
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function(amount) {
  if (this.discountType === "percentage") {
    let discount = (amount * this.discountValue) / 100;
    
    // Apply maximum discount if set
    if (this.maximumDiscount !== null && discount > this.maximumDiscount) {
      discount = this.maximumDiscount;
    }
    
    return discount;
  } else {
    // Fixed discount
    return this.discountValue;
  }
};

module.exports = mongoose.model("Coupon", couponSchema);

