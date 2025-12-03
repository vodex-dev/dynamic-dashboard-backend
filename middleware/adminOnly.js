module.exports = function (req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "🚫 صلاحية مرفوضة: هذا الإجراء للأدمن فقط" });
  }
  next();
};
