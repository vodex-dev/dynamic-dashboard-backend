const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const User = require("../models/User");
const Coupon = require("../models/Coupon");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const { createPayment: createSindipayPayment, getPaymentStatus: getSindipayPaymentStatus } = require("../utils/sindipay");
const { v4: uuidv4 } = require("uuid");

const SINDIPAY_API_KEY = process.env.SINDIPAY_API_KEY;

/* ============================================================
   💳 إنشاء عملية دفع جديدة
============================================================ */
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { planId, callbackUrl, webhookUrl, couponCode } = req.body;

    if (!planId) {
      return res.status(400).json({ error: "❌ يجب تحديد الخطة" });
    }

    // التحقق من وجود الخطة
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: "❌ الخطة غير موجودة أو غير نشطة" });
    }

    // حساب المبلغ النهائي (مع تطبيق الكوبون إن وجد)
    let finalAmount = plan.price;
    let discount = 0;
    let couponId = null;
    let couponData = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
      
      if (coupon) {
        const validation = coupon.isValid(userId);
        
        if (validation.valid && plan.price >= coupon.minimumAmount) {
          discount = coupon.calculateDiscount(plan.price);
          finalAmount = Math.max(0, plan.price - discount);
          couponId = coupon._id;
          couponData = {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discount: discount,
          };
        }
      }
    }

    // إنشاء order ID فريد
    const orderId = `order_${userId}_${Date.now()}_${uuidv4()}`;

    // إعداد callback URL مع order_id في URL params
    const baseCallbackUrl = callbackUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`;
    const callbackUrlWithOrderId = `${baseCallbackUrl}?order_id=${encodeURIComponent(orderId)}`;
    
    console.log(">>> CALLBACK URL SENT TO SINDIPAY:", callbackUrlWithOrderId);
    console.log(">>> Order ID used in callback URL:", orderId);
    console.log(">>> Base callback URL:", baseCallbackUrl);
    console.log(">>> Encoded order_id:", encodeURIComponent(orderId));
    
    // إعداد بيانات الدفع لـ Sindipay
    const paymentData = {
      title: `Subscription - ${plan.name}${couponData ? ` (${couponData.code})` : ''}`,
      order_id: orderId,
      total_amount: finalAmount.toString(),
      currency: "IQD",
      locale: "ar",
      callback_url: callbackUrlWithOrderId, // نضيف order_id في URL للتحكم الكامل
      webhook_url: webhookUrl || `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/payments/webhook`,
      meta_data: {
        userId: userId.toString(),
        planId: planId.toString(),
        planName: plan.name,
        originalAmount: plan.price.toString(),
        discount: discount.toString(),
        finalAmount: finalAmount.toString(),
        ...(couponId && { couponId: couponId.toString() }),
        ...(couponData && { couponCode: couponData.code }),
      },
    };

    // إنشاء الدفع في Sindipay
    console.log('Creating payment with Sindipay:', {
      paymentData,
      apiKey: SINDIPAY_API_KEY ? 'Set' : 'Not Set',
    });
    
    const sindipayResponse = await createSindipayPayment(paymentData);
    
    console.log('Sindipay response:', sindipayResponse);

    // التحقق من أن الـ response يحتوي على البيانات المطلوبة
    if (!sindipayResponse || !sindipayResponse.id) {
      throw new Error('Invalid response from Sindipay API');
    }

    // حفظ معلومات الدفع في قاعدة البيانات
    const payment = await Payment.create({
      paymentId: sindipayResponse.id,
      orderId: orderId,
      planId: planId,
      userId: userId,
      title: sindipayResponse.title || paymentData.title,
      totalAmount: sindipayResponse.total_amount || paymentData.total_amount,
      currency: sindipayResponse.currency || paymentData.currency,
      paymentUrl: sindipayResponse.url || sindipayResponse.payment_url,
      status: sindipayResponse.status || 'CREATED',
      callbackUrl: sindipayResponse.callback_url || paymentData.callback_url,
      webhookUrl: sindipayResponse.webhook_url || paymentData.webhook_url,
      metadata: {
        ...(sindipayResponse.meta_data || paymentData.meta_data || {}),
        originalAmount: plan.price.toString(),
        discount: discount.toString(),
        ...(couponId && { couponId: couponId.toString() }),
        ...(couponData && { couponCode: couponData.code }),
      },
    });

    // تحديث استخدام الكوبون إذا تم استخدامه
    if (couponId) {
      try {
        const coupon = await Coupon.findById(couponId);
        if (coupon) {
          coupon.usedCount += 1;
          coupon.usedBy.push({
            userId: userId,
            usedAt: new Date(),
          });
          await coupon.save();
        }
      } catch (couponError) {
        console.error("Error updating coupon usage:", couponError);
      }
    }

    console.log(">>> Payment saved to DB:");
    console.log({
      savedPaymentId: payment.paymentId,
      savedOrderId: payment.orderId,
      savedId: payment._id.toString(),
      savedCallbackUrl: payment.callbackUrl,
      savedStatus: payment.status,
      savedCreatedAt: payment.createdAt,
    });

    res.status(201).json({
      message: "✅ تم إنشاء عملية الدفع بنجاح",
      payment: {
        id: payment._id,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        paymentUrl: payment.paymentUrl,
        status: payment.status,
      },
    });
  } catch (err) {
    console.error("❌ خطأ في إنشاء عملية الدفع:", {
      message: err.message,
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status,
    });
    
    // إرجاع رسالة خطأ واضحة
    const errorMessage = err.message || "فشل في إنشاء عملية الدفع";
    const errorDetails = err.response?.data || {};
    
    res.status(err.response?.status || 500).json({ 
      error: errorMessage,
      details: errorDetails,
      message: errorMessage, // للتوافق مع frontend
    });
  }
});

/* ============================================================
   📋 جلب حالة الدفع من callback (بدون authentication - للاستخدام بعد redirect من Sindipay)
============================================================ */
router.get("/callback-status/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;

    console.log(">>> CALLBACK-STATUS HIT");
    console.log("Identifier received from URL:", identifier);
    console.log("Raw identifier from params:", req.params.identifier);
    console.log("Full URL:", req.url);
    console.log("Method:", req.method);

    if (!identifier) {
      return res.status(400).json({ error: "❌ يجب تحديد Payment ID أو Order ID" });
    }

    // عرض جميع المدفوعات في قاعدة البيانات قبل البحث
    console.log(">>> Payments currently in database:");
    try {
      const allPayments = await Payment.find({}).sort({ createdAt: -1 }).limit(10);
      console.log(`Total payments in DB: ${await Payment.countDocuments()}`);
      allPayments.forEach((p, index) => {
        console.log(`Payment ${index + 1}:`, {
          paymentId: p.paymentId,
          orderId: p.orderId,
          createdAt: p.createdAt,
          status: p.status,
          _id: p._id.toString(),
        });
      });
    } catch (allPaymentsError) {
      console.error(">>> Error fetching all payments:", allPaymentsError.message);
    }

    // البحث عن الدفع في قاعدة البيانات أولاً (للتأكد من نوع المعرف)
    let payment = null;
    try {
      // محاولة التحقق إذا كان المعرف رقم (paymentId) أو نص (orderId)
      const parsedId = parseInt(identifier);
      const isNumeric = !isNaN(parsedId) && identifier === parsedId.toString();
      
      console.log('🔍 [callback-status] Searching for payment:', {
        identifier: identifier,
        isNumeric: isNumeric,
        parsedId: isNumeric ? parsedId : null,
        searchQuery: {
          $or: [
            ...(isNumeric ? [{ paymentId: parsedId }] : []),
            { orderId: identifier },
          ],
        },
      });
      
      payment = await Payment.findOne({
        $or: [
          ...(isNumeric ? [{ paymentId: parsedId }] : []), // إذا كان رقم، جرب paymentId
          { orderId: identifier }, // دائماً جرب orderId (يدعم النصوص والأرقام)
        ],
      }).populate("planId").select("-__v");
      
      console.log('🔍 [callback-status] Payment lookup result:', {
        found: !!payment,
        paymentId: payment?.paymentId,
        orderId: payment?.orderId,
        status: payment?.status,
      });
    } catch (dbError) {
      console.error("❌ [callback-status] Database error:", {
        message: dbError.message,
        stack: dbError.stack,
        identifier: identifier,
      });
    }

    // إذا لم نجد الدفع في قاعدة البيانات، نعيد خطأ
    if (!payment) {
      return res.status(404).json({ 
        success: false,
        error: "❌ عملية الدفع غير موجودة",
        identifier: identifier,
      });
    }

    // الآن نستخدم paymentId الصحيح من قاعدة البيانات لاستدعاء Sindipay API
    try {
      const sindipayStatus = await getSindipayPaymentStatus(payment.paymentId);

      // تحديث الحالة في قاعدة البيانات
      if (sindipayStatus.status !== payment.status) {
        const newStatus = sindipayStatus.status?.toUpperCase() || sindipayStatus.status;
        payment.status = newStatus;
        
        if (newStatus === "PAID") {
          payment.paidAt = new Date();
          
          // إنشاء الاشتراك إذا لم يكن موجود
          if (!payment.subscriptionId) {
            try {
              const plan = payment.planId;
              const duration = plan?.duration || 30;
              
              const subscription = new Subscription({
                userId: payment.userId,
                planId: payment.planId._id || payment.planId,
                startDate: new Date(),
                endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
                status: "active",
              });
              await subscription.save();

              // ربط الاشتراك بالدفع
              payment.subscriptionId = subscription._id;

              // تحديث المستخدم
              const user = await User.findById(payment.userId);
              if (user) {
                // إلغاء الاشتراكات السابقة
                await Subscription.updateMany(
                  { userId: user._id, status: "active", _id: { $ne: subscription._id } },
                  { status: "cancelled" }
                );
                
                user.currentSubscription = subscription._id;
                await user.save();
              }
            } catch (subError) {
              console.error("Error creating subscription:", subError);
            }
          }
        } else if (newStatus === "FAILED" || newStatus === "DECLINED") {
          // تحديث الحالة للدفع المرفوض
          console.log(`Payment ${payment.paymentId} status changed to ${newStatus}`);
        }
        
        await payment.save();
      }

      // تحويل status إلى uppercase للتوحيد
      const statusUpper = sindipayStatus.status?.toUpperCase() || sindipayStatus.status;
      
      res.status(200).json({
        success: true,
        payment: {
          id: payment?._id || null,
          paymentId: sindipayStatus.id,
          orderId: sindipayStatus.order_id || payment?.orderId,
          status: statusUpper,
          totalAmount: sindipayStatus.total_amount || payment?.totalAmount,
          currency: sindipayStatus.currency || payment?.currency,
          plan: payment?.planId || null,
          paidAt: payment?.paidAt || null,
        },
        sindipayResponse: sindipayStatus,
      });
    } catch (sindipayError) {
      console.error("Error fetching status from Sindipay:", sindipayError);
      
      // إذا فشل استدعاء Sindipay API، نعيد الحالة من قاعدة البيانات
      if (payment) {
        return res.status(200).json({
          success: true,
          payment: {
            id: payment._id,
            paymentId: payment.paymentId,
            orderId: payment.orderId,
            status: payment.status,
            totalAmount: payment.totalAmount,
            currency: payment.currency,
            plan: payment.planId,
            paidAt: payment.paidAt,
          },
          note: "Status from database (Sindipay API unavailable)",
          error: sindipayError.message,
        });
      }

      throw sindipayError;
    }
  } catch (err) {
    console.error("❌ خطأ في جلب حالة الدفع من callback:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "فشل في جلب حالة الدفع",
      details: err.response?.data || {},
    });
  }
});

/* ============================================================
   📋 جلب حالة الدفع (مع authentication)
============================================================ */
router.get("/status/:paymentId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentId } = req.params;

    // جلب الدفع من قاعدة البيانات
    const payment = await Payment.findOne({
      $or: [
        { _id: paymentId },
        { paymentId: parseInt(paymentId) },
        { orderId: paymentId },
      ],
      userId: userId,
    }).populate("planId");

    if (!payment) {
      return res.status(404).json({ error: "❌ عملية الدفع غير موجودة" });
    }

    // جلب الحالة المحدثة من Sindipay
    try {
      const sindipayStatus = await getSindipayPaymentStatus(payment.paymentId);
      
      // تحديث الحالة إذا تغيرت
      if (sindipayStatus.status !== payment.status) {
        payment.status = sindipayStatus.status;
        
        if (sindipayStatus.status === "PAID") {
          payment.paidAt = new Date();
        }
        
        await payment.save();
      }
    } catch (error) {
      console.error("Error fetching status from Sindipay:", error);
      // نستمر في إرجاع الحالة المحلية حتى لو فشل الاتصال بـ Sindipay
    }

    res.status(200).json({
      payment: {
        id: payment._id,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        status: payment.status,
        paymentUrl: payment.paymentUrl,
        totalAmount: payment.totalAmount,
        currency: payment.currency,
        plan: payment.planId,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (err) {
    console.error("❌ خطأ في جلب حالة الدفع:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🔔 Webhook Handler - استقبال إشعارات من Sindipay
============================================================ */
router.post("/webhook", async (req, res) => {
  try {
    const { id, status, order_id } = req.body;

    if (!id || !status || !order_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // البحث عن الدفع في قاعدة البيانات
    const payment = await Payment.findOne({
      $or: [
        { paymentId: parseInt(id) },
        { orderId: order_id },
      ],
    }).populate("planId").populate("userId");

    if (!payment) {
      console.error("Payment not found for webhook:", { id, order_id });
      return res.status(404).json({ error: "Payment not found" });
    }

    // تحديث حالة الدفع
    const previousStatus = payment.status;
    payment.status = status;
    payment.webhookReceived = true;
    payment.webhookReceivedAt = new Date();

    if (status === "PAID") {
      payment.paidAt = new Date();

      // إنشاء أو تحديث الاشتراك إذا كان الدفع ناجح
      if (!payment.subscriptionId) {
        const plan = payment.planId;
        const user = payment.userId;

        // إلغاء الاشتراكات السابقة
        await Subscription.updateMany(
          { userId: user._id, status: "active" },
          { status: "cancelled" }
        );

        // حساب تواريخ الاشتراك
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.duration);

        // إنشاء اشتراك جديد
        const subscription = await Subscription.create({
          userId: user._id,
          planId: plan._id,
          startDate: startDate,
          endDate: endDate,
          status: "active",
        });

        // ربط الاشتراك بالدفع
        payment.subscriptionId = subscription._id;
        await payment.save();

        // تحديث المستخدم
        user.currentSubscription = subscription._id;
        await user.save();

        console.log("✅ Subscription created from payment:", subscription._id);
      }
    }

    await payment.save();

    console.log(`✅ Webhook received: Payment ${payment.paymentId} status changed from ${previousStatus} to ${status}`);

    res.status(200).json({ 
      message: "Webhook processed successfully",
      paymentId: payment.paymentId,
      status: payment.status,
    });
  } catch (err) {
    console.error("❌ خطأ في معالجة webhook:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   📋 جلب جميع المدفوعات للمستخدم
============================================================ */
router.get("/my-payments", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const payments = await Payment.find({ userId: userId })
      .populate("planId")
      .populate("subscriptionId")
      .sort({ createdAt: -1 });

    res.status(200).json(payments);
  } catch (err) {
    console.error("❌ خطأ في جلب المدفوعات:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   🧪 اختبار الدفع مباشرة بدون authentication (للاختبار فقط)
============================================================ */
router.post("/test-direct", async (req, res) => {
  try {
    const { amount = "1000", cardType = "success" } = req.body;

    // إنشاء order ID فريد
    const orderId = `test_order_${Date.now()}_${uuidv4()}`;

    // إعداد بيانات الدفع لـ Sindipay
    const paymentData = {
      title: `Test Payment - ${cardType === "success" ? "Success Card" : "Decline Card"}`,
      order_id: orderId,
      total_amount: amount.toString(),
      currency: "IQD",
      locale: "ar",
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`,
      webhook_url: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/payments/webhook`,
      meta_data: {
        test: true,
        cardType: cardType,
        amount: amount,
      },
    };

    console.log('🧪 Testing payment with Sindipay (Direct):', {
      paymentData,
      apiKey: SINDIPAY_API_KEY ? 'Set' : 'Not Set',
    });

    // إنشاء الدفع في Sindipay
    const sindipayResponse = await createSindipayPayment(paymentData);

    console.log('✅ Sindipay test response:', sindipayResponse);

    // إرجاع النتيجة الكاملة
    res.status(200).json({
      success: true,
      message: "✅ تم إنشاء عملية الدفع التجريبية بنجاح",
      testData: {
        orderId: orderId,
        amount: amount,
        cardType: cardType,
        testCards: {
          success: {
            cardNumber: "5213 7203 0423 8582",
            cvv: "642",
            expiry: "01/32",
          },
          decline: {
            cardNumber: "2342 3423 4342 1243",
            cvv: "642",
            expiry: "01/32",
          },
        },
      },
      sindipayResponse: sindipayResponse,
      paymentUrl: sindipayResponse.url || sindipayResponse.payment_url,
      paymentId: sindipayResponse.id,
      instructions: {
        step1: "استخدم البطاقة التجريبية التالية:",
        step2: cardType === "success" 
          ? "Card: 5213 7203 0423 8582, CVV: 642, Expiry: 01/32 (Success)"
          : "Card: 2342 3423 4342 1243, CVV: 642, Expiry: 01/32 (Decline)",
        step3: "اذهب إلى paymentUrl أعلاه لإكمال الدفع",
        step4: "بعد الدفع، ستتلقى webhook في /api/payments/webhook",
      },
    });
  } catch (err) {
    console.error("❌ خطأ في اختبار الدفع:", {
      message: err.message,
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status,
    });

    res.status(err.response?.status || 500).json({
      success: false,
      error: err.message || "فشل في اختبار الدفع",
      details: err.response?.data || {},
      message: err.message,
    });
  }
});

/* ============================================================
   🧪 اختبار الدفع مباشرة (للاختبار فقط - Admin)
============================================================ */
router.post("/test-payment", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { amount = "1000", cardType = "success" } = req.body;

    // إنشاء order ID فريد
    const orderId = `test_order_${Date.now()}_${uuidv4()}`;

    // إعداد بيانات الدفع لـ Sindipay
    const paymentData = {
      title: `Test Payment - ${cardType === "success" ? "Success Card" : "Decline Card"}`,
      order_id: orderId,
      total_amount: amount.toString(),
      currency: "IQD",
      locale: "ar",
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`,
      webhook_url: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/payments/webhook`,
      meta_data: {
        test: true,
        cardType: cardType,
        amount: amount,
      },
    };

    console.log('🧪 Testing payment with Sindipay:', {
      paymentData,
      apiKey: SINDIPAY_API_KEY ? 'Set' : 'Not Set',
    });

    // إنشاء الدفع في Sindipay
    const sindipayResponse = await createSindipayPayment(paymentData);

    console.log('✅ Sindipay test response:', sindipayResponse);

    // إرجاع النتيجة الكاملة
    res.status(200).json({
      success: true,
      message: "✅ تم إنشاء عملية الدفع التجريبية بنجاح",
      testData: {
        orderId: orderId,
        amount: amount,
        cardType: cardType,
        testCards: {
          success: {
            cardNumber: "5213 7203 0423 8582",
            cvv: "642",
            expiry: "01/32",
          },
          decline: {
            cardNumber: "2342 3423 4342 1243",
            cvv: "642",
            expiry: "01/32",
          },
        },
      },
      sindipayResponse: sindipayResponse,
      paymentUrl: sindipayResponse.url || sindipayResponse.payment_url,
      paymentId: sindipayResponse.id,
      instructions: {
        step1: "استخدم البطاقة التجريبية التالية:",
        step2: cardType === "success" 
          ? "Card: 5213 7203 0423 8582, CVV: 642, Expiry: 01/32 (Success)"
          : "Card: 2342 3423 4342 1243, CVV: 642, Expiry: 01/32 (Decline)",
        step3: "اذهب إلى paymentUrl أعلاه لإكمال الدفع",
        step4: "بعد الدفع، ستتلقى webhook في /api/payments/webhook",
      },
    });
  } catch (err) {
    console.error("❌ خطأ في اختبار الدفع:", {
      message: err.message,
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status,
    });

    res.status(err.response?.status || 500).json({
      success: false,
      error: err.message || "فشل في اختبار الدفع",
      details: err.response?.data || {},
      message: err.message,
    });
  }
});

module.exports = router;

