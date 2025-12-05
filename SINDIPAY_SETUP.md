# Sindipay Payment Gateway Setup

## Environment Variables Required

Add these variables to your `.env` file in the backend:

```env
# Sindipay API Configuration
SINDIPAY_API_KEY=sp_G-M1h5-7nRgxvbx3M0Rj2lkmOZCdSPnWX85y77lO07-dmYbf8QpHKQ
SINDIPAY_BASE_URL=https://sindipay.xyz/api/v1

# Frontend and Backend URLs (for callbacks and webhooks)
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000
```

## Installation

1. Install required packages:
```bash
cd dynamic-dashboard-backend-main
npm install axios uuid
```

2. Make sure your `.env` file contains all the required variables above.

3. Restart your backend server.

## Payment Flow

1. **User clicks "Subscribe"** → Frontend calls `POST /api/payments/create`
2. **Backend creates payment** → Calls Sindipay API to create payment
3. **User redirected** → To Sindipay payment page (`paymentUrl`)
4. **User completes payment** → Sindipay redirects to `callback_url`
5. **Webhook received** → Sindipay sends webhook to `webhook_url`
6. **Subscription created** → Backend creates subscription when payment is confirmed

## API Endpoints

### Backend Routes

- `POST /api/payments/create` - Create a new payment
- `GET /api/payments/status/:paymentId` - Get payment status
- `POST /api/payments/webhook` - Receive webhooks from Sindipay
- `GET /api/payments/my-payments` - Get user's payment history

### Frontend Routes

- `/user/plans` - Plans page with payment buttons
- `/payment/callback` - Payment callback page (after payment)

## Testing

1. Make sure your backend is running
2. Make sure your frontend is running
3. Login as a user
4. Go to Plans page
5. Click "Subscribe" on any plan
6. You will be redirected to Sindipay payment page
7. After payment, you'll be redirected back to callback page

## Notes

- The webhook handler automatically creates subscriptions when payment is confirmed
- Payment status is checked both via webhook and manual status check
- All payments are stored in the database for history tracking

