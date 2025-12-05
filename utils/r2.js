const AWS = require("aws-sdk");

// التحقق من وجود المتغيرات المطلوبة
if (!process.env.CLOUDFLARE_R2_ENDPOINT) {
  console.error("⚠️ تحذير: CLOUDFLARE_R2_ENDPOINT غير موجود في متغيرات البيئة");
}

if (!process.env.CLOUDFLARE_ACCESS_KEY_ID) {
  console.error("⚠️ تحذير: CLOUDFLARE_ACCESS_KEY_ID غير موجود في متغيرات البيئة");
}

if (!process.env.CLOUDFLARE_SECRET_ACCESS_KEY) {
  console.error("⚠️ تحذير: CLOUDFLARE_SECRET_ACCESS_KEY غير موجود في متغيرات البيئة");
}

const s3 = new AWS.S3({
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
  region: "auto", // Cloudflare R2 requires "auto" region
});

// هذا هو رابط الـ Public Development URL من Cloudflare
// يمكن استخدامه كقيمة افتراضية إذا لم يكن CLOUDFLARE_R2_PUBLIC_URL موجوداً
const PUBLIC_R2_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || "https://pub-bb55e537cfe7423592cd37fd68a6c6a7.r2.dev";

module.exports = { s3, PUBLIC_R2_URL };
