const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "❌ لا يوجد توكن، غير مصرح لك بالدخول" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // يحتوي على userId و role
    next();
  } catch (err) {
    res.status(401).json({ message: "❌ توكن غير صالح أو منتهي الصلاحية" });
  }
};
