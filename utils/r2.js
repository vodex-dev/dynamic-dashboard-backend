const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
});

// هذا هو رابط الـ Public Development URL من Cloudflare
const PUBLIC_R2_URL = "https://pub-bb55e537cfe7423592cd37fd68a6c6a7.r2.dev";

module.exports = { s3, PUBLIC_R2_URL };
