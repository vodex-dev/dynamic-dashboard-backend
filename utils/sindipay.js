const axios = require('axios');

const SINDIPAY_BASE_URL = process.env.SINDIPAY_BASE_URL || 'https://sindipay.xyz/api/v1';
const SINDIPAY_API_KEY = process.env.SINDIPAY_API_KEY;

/**
 * Create a payment with Sindipay
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} Payment response from Sindipay
 */
const createPayment = async (paymentData) => {
  try {
    if (!SINDIPAY_API_KEY) {
      throw new Error('SINDIPAY_API_KEY is not configured');
    }

    console.log('Sending request to Sindipay:', {
      url: `${SINDIPAY_BASE_URL}/payments/gateway/`,
      data: paymentData,
      headers: {
        'X-API-Key': SINDIPAY_API_KEY ? 'Set' : 'Not Set',
        'Content-Type': 'application/json',
      },
    });

    const response = await axios.post(
      `${SINDIPAY_BASE_URL}/payments/gateway/`,
      paymentData,
      {
        headers: {
          'X-API-Key': SINDIPAY_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      }
    );
    
    console.log('Sindipay response received:', {
      status: response.status,
      data: response.data,
    });

    console.log(">>> Sindipay Create Payment Response (raw):", JSON.stringify(response.data, null, 2));
    console.log(">>> Sindipay Response - callback_url:", response.data?.callback_url);
    console.log(">>> Sindipay Response - order_id:", response.data?.order_id);

    return response.data;
  } catch (error) {
    console.error('Sindipay API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
    });
    
    // إرجاع رسالة خطأ أكثر تفصيلاً
    const errorMessage = 
      error.response?.data?.detail || 
      error.response?.data?.message || 
      error.response?.data?.error ||
      error.message || 
      'Failed to create payment with Sindipay';
    
    throw new Error(errorMessage);
  }
};

/**
 * Get payment status from Sindipay
 * @param {Number} paymentId - Payment ID from Sindipay
 * @returns {Promise<Object>} Payment status from Sindipay
 */
const getPaymentStatus = async (paymentId) => {
  try {
    if (!SINDIPAY_API_KEY) {
      throw new Error('SINDIPAY_API_KEY is not configured');
    }

    const response = await axios.get(
      `${SINDIPAY_BASE_URL}/payments/gateway/${paymentId}/`,
      {
        headers: {
          'X-API-Key': SINDIPAY_API_KEY,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Sindipay API Error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.detail || 
      error.response?.data?.message || 
      'Failed to get payment status from Sindipay'
    );
  }
};

module.exports = {
  createPayment,
  getPaymentStatus,
};

