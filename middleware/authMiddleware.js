const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function (req, res, next) {
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
    
    // التحقق من حالة الحساب (معلق أم لا)
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "❌ المستخدم غير موجود" });
    }

    if (user.isSuspended) {
      return res.status(403).json({ 
        message: "❌ حسابك متوقف. يرجى التواصل مع الدعم الفني.",
        isSuspended: true 
      });
    }

    req.user = decoded; // إضافة بيانات المستخدم للطلب
    next(); // الانتقال للخطوة التالية
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res
      .status(401)
      .json({ message: "❌ التوكن غير صالح أو انتهت صلاحيته" });
  }
};
