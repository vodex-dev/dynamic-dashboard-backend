const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const authHeader = req.header("Authorization");

  // تحقق من وجود الهيدر وصيغته الصحيحة
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "❌ لا يوجد توكن، غير مصرح لك بالدخول" });
  }

  // فصل الكلمة Bearer عن التوكن الحقيقي
  const token = authHeader.split(" ")[1];

  try {
    // فك التوكن والتحقق منه
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // إضافة بيانات المستخدم للطلب
    next(); // الانتقال للخطوة التالية
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res
      .status(401)
      .json({ message: "❌ التوكن غير صالح أو انتهت صلاحيته" });
  }
};
