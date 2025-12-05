const axios = require('axios');
require('dotenv').config();

const SINDIPAY_BASE_URL = process.env.SINDIPAY_BASE_URL || 'https://sindipay.xyz/api/v1';
const SINDIPAY_API_KEY = process.env.SINDIPAY_API_KEY;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

// بيانات الاختبار
const testData = {
  amount: "1000", // 1000 دينار عراقي
  cardType: "success", // أو "decline"
};

async function testPayment() {
  try {
    console.log('🧪 بدء اختبار الدفع مع Sindipay...\n');
    console.log('📋 بيانات الاختبار:');
    console.log(`   - المبلغ: ${testData.amount} IQD`);
    console.log(`   - نوع البطاقة: ${testData.cardType}\n`);

    // إنشاء order ID
    const { v4: uuidv4 } = require('uuid');
    const orderId = `test_order_${Date.now()}_${uuidv4()}`;

    // إعداد بيانات الدفع
    const paymentData = {
      title: `Test Payment - ${testData.cardType === "success" ? "Success Card" : "Decline Card"}`,
      order_id: orderId,
      total_amount: testData.amount,
      currency: "IQD",
      locale: "ar",
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`,
      webhook_url: `${BACKEND_URL}/api/payments/webhook`,
      meta_data: {
        test: true,
        cardType: testData.cardType,
        amount: testData.amount,
      },
    };

    console.log('📤 إرسال الطلب إلى Sindipay...');
    console.log('   URL:', `${SINDIPAY_BASE_URL}/payments/gateway/`);
    console.log('   Data:', JSON.stringify(paymentData, null, 2));
    console.log('   API Key:', SINDIPAY_API_KEY ? 'Set ✅' : 'Not Set ❌\n');

    if (!SINDIPAY_API_KEY) {
      throw new Error('SINDIPAY_API_KEY is not configured in .env file');
    }

    // إرسال الطلب
    const response = await axios.post(
      `${SINDIPAY_BASE_URL}/payments/gateway/`,
      paymentData,
      {
        headers: {
          'X-API-Key': SINDIPAY_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('✅ تم استلام الرد من Sindipay!\n');
    console.log('📊 النتيجة:');
    console.log('   Status:', response.status);
    console.log('   Payment ID:', response.data.id);
    console.log('   Payment URL:', response.data.url || response.data.payment_url);
    console.log('   Status:', response.data.status);
    console.log('\n📋 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n💳 معلومات البطاقة التجريبية:');
    if (testData.cardType === "success") {
      console.log('   Card Number: 5213 7203 0423 8582');
      console.log('   CVV: 642');
      console.log('   Expiry: 01/32');
      console.log('   Type: Success ✅');
    } else {
      console.log('   Card Number: 2342 3423 4342 1243');
      console.log('   CVV: 642');
      console.log('   Expiry: 01/32');
      console.log('   Type: Decline ❌');
    }

    console.log('\n🔗 رابط الدفع:');
    console.log(`   ${response.data.url || response.data.payment_url}\n`);

    console.log('✅ الاختبار نجح! استخدم رابط الدفع أعلاه لإكمال الدفع.\n');

  } catch (error) {
    console.error('\n❌ خطأ في الاختبار:\n');
    console.error('   Status:', error.response?.status);
    console.error('   Status Text:', error.response?.statusText);
    console.error('   Error Message:', error.message);
    
    if (error.response?.data) {
      console.error('\n   Error Details:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.config) {
      console.error('\n   Request URL:', error.config.url);
      console.error('   Request Method:', error.config.method);
    }
    
    process.exit(1);
  }
}

// تشغيل الاختبار
testPayment();

