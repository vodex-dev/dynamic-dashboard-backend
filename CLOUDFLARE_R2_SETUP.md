# إعداد Cloudflare R2 للرفع

## المتغيرات المطلوبة في ملف `.env`

يجب إضافة المتغيرات التالية إلى ملف `.env` في مجلد `dynamic-dashboard-backend-main`:

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_R2_BUCKET=your-bucket-name
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

## كيفية الحصول على هذه القيم من Cloudflare:

### 1. CLOUDFLARE_R2_ENDPOINT
- اذهب إلى Cloudflare Dashboard → R2 → Manage R2 API Tokens
- انسخ الـ Endpoint URL
- الصيغة: `https://<account-id>.r2.cloudflarestorage.com`

### 2. CLOUDFLARE_ACCESS_KEY_ID و CLOUDFLARE_SECRET_ACCESS_KEY
- اذهب إلى Cloudflare Dashboard → R2 → Manage R2 API Tokens
- أنشئ API Token جديد أو استخدم الموجود
- انسخ الـ Access Key ID و Secret Access Key

### 3. CLOUDFLARE_R2_BUCKET
- اسم الـ Bucket الذي أنشأته في Cloudflare R2
- مثال: `my-images-bucket`

### 4. CLOUDFLARE_R2_PUBLIC_URL
- اذهب إلى Cloudflare Dashboard → R2 → Your Bucket → Settings
- في قسم "Public Access" أو "Custom Domain"
- انسخ الـ Public URL
- الصيغة: `https://pub-xxxxx.r2.dev` أو `https://your-custom-domain.com`

## ملاحظات مهمة:

1. **Public Access**: تأكد من تفعيل Public Access للـ Bucket إذا كنت تستخدم Public URL
2. **CORS**: قد تحتاج إلى إعداد CORS في Cloudflare R2 للسماح بالرفع من الـ frontend
3. **Permissions**: تأكد من أن الـ API Token لديه صلاحيات القراءة والكتابة على الـ Bucket

## التحقق من الإعداد:

بعد إضافة المتغيرات، أعد تشغيل الـ backend server. إذا كانت هناك مشكلة، ستظهر رسالة خطأ واضحة في الـ console تشير إلى المتغير المفقود.

