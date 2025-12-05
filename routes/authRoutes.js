const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

/* ============================================================
   🧩 تسجيل مستخدم جديد (Register)
============================================================ */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // 🔍 تحقق من وجود المستخدم مسبقًا
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "❌ اسم المستخدم أو البريد مستخدم مسبقًا" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashedPassword, role });
    await user.save();

    res.status(201).json({ message: "✅ تم إنشاء المستخدم بنجاح" });
  } catch (err) {
    console.error("❌ خطأ في إنشاء المستخدم:", err);
    res.status(500).json({ message: "❌ خطأ في السيرفر" });
  }
});

/* ============================================================
   🔐 تسجيل الدخول (Login)
============================================================ */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "❌ اسم المستخدم غير موجود" });
    }

    // التحقق من حالة الحساب
    if (user.isSuspended) {
      return res.status(403).json({ 
        message: "❌ حسابك متوقف. يرجى التواصل مع الدعم الفني.",
        isSuspended: true 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "❌ كلمة المرور غير صحيحة" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "✅ تسجيل الدخول ناجح",
      token,
      role: user.role,
      userId: user._id,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isSuspended: user.isSuspended,
      },
    });
  } catch (err) {
    console.error("❌ خطأ في تسجيل الدخول:", err);
    res.status(500).json({ message: "❌ خطأ في السيرفر" });
  }
});

/* ============================================================
   👑 جلب جميع المستخدمين (Admins فقط)
============================================================ */
router.get("/users", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const users = await User.find({}, { password: 0, tempPassword: 0 }).select("-password -tempPassword");
    res.status(200).json({ data: users });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/* ============================================================
   👑 إنشاء مستخدم جديد (Admin فقط) - مع إرجاع البيانات
   يجب أن يكون قبل routes مع :userId
============================================================ */
router.post("/users/create", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { username, email, password, role = "user" } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: "❌ يجب إدخال اسم المستخدم والبريد الإلكتروني" });
    }

    // 🔍 تحقق من وجود المستخدم مسبقًا
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "❌ اسم المستخدم أو البريد مستخدم مسبقًا" });
    }

    // إنشاء كلمة مرور تلقائية إذا لم يتم إدخالها
    const generatedPassword = password || Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + "!@#";
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role,
      tempPassword: generatedPassword, // حفظ كلمة المرور المؤقتة للعرض
      lastPasswordChange: null,
    });

    await user.save();

    res.status(201).json({
      message: "✅ تم إنشاء المستخدم بنجاح",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      credentials: {
        username: user.username,
        password: generatedPassword,
      },
    });
  } catch (error) {
    console.error("❌ Error creating user:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});

/* ============================================================
   📜 الصفحات المسموح بها (Pages)
============================================================ */
router.get("/users/:userId/pages", authMiddleware, async (req, res) => {
  try {
    const requesterId = req.user.userId || req.user.id;
    const targetId = req.params.userId;

    if (req.user.role !== "admin" && requesterId !== targetId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(targetId).populate("allowedPages", "name");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ data: user.allowedPages || [] });
  } catch (error) {
    console.error("❌ Error fetching user pages:", error);
    res.status(500).json({ message: "Failed to fetch user pages" });
  }
});

router.put("/users/:userId/pages", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { pageIds } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { allowedPages: pageIds },
      { new: true }
    ).populate("allowedPages", "name");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({
      message: "✅ User pages updated successfully",
      data: updatedUser.allowedPages,
    });
  } catch (error) {
    console.error("❌ Error updating user pages:", error);
    res.status(500).json({ message: "Failed to update user pages" });
  }
});

/* ============================================================
   📦 الكولكشنز المسموح بها (Collections)
============================================================ */
router.get("/users/:userId/collections", authMiddleware, async (req, res) => {
  try {
    const requesterId = req.user.userId || req.user.id;
    const targetId = req.params.userId;

    if (req.user.role !== "admin" && requesterId !== targetId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(targetId).populate("collections", "name");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ data: user.collections || [] });
  } catch (error) {
    console.error("❌ Error fetching user collections:", error);
    res.status(500).json({ message: "Failed to fetch user collections" });
  }
});

router.put("/users/:userId/collections", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { collectionIds } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { collections: collectionIds },
      { new: true }
    ).populate("collections", "name");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({
      message: "✅ User collections updated successfully",
      data: updatedUser.collections,
    });
  } catch (error) {
    console.error("❌ Error updating user collections:", error);
    res.status(500).json({ message: "Failed to update user collections" });
  }
});

/* ============================================================
   🧾 الفورمات المسموح بها (Forms)
============================================================ */
router.get("/users/:userId/forms", authMiddleware, async (req, res) => {
  try {
    const requesterId = req.user.userId || req.user.id;
    const targetId = req.params.userId;

    if (req.user.role !== "admin" && requesterId !== targetId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(targetId).populate("allowedForms", "name");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ data: user.allowedForms || [] });
  } catch (error) {
    console.error("❌ Error fetching user forms:", error);
    res.status(500).json({ message: "Failed to fetch user forms" });
  }
});

router.put("/users/:userId/forms", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { formIds } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { allowedForms: formIds },
      { new: true }
    ).populate("allowedForms", "name");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({
      message: "✅ User forms updated successfully",
      data: updatedUser.allowedForms,
    });
  } catch (error) {
    console.error("❌ Error updating user forms:", error);
    res.status(500).json({ message: "Failed to update user forms" });
  }
});

/* ============================================================
   🗑️ حذف مستخدم (Admin فقط)
============================================================ */
router.delete("/users/:userId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { userId } = req.params;
    const currentUserId = req.user.userId?.toString() || req.user.userId;

    // منع حذف نفسه
    if (userId === currentUserId || userId.toString() === currentUserId) {
      return res.status(400).json({ message: "❌ لا يمكنك حذف حسابك الخاص" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "❌ المستخدم غير موجود" });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "✅ تم حذف المستخدم بنجاح" });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

/* ============================================================
   👁️ رؤية كلمة المرور (Admin فقط) - فقط الكلمة المؤقتة
============================================================ */
router.get("/users/:userId/password", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "❌ المستخدم غير موجود" });
    }

    // إرجاع كلمة المرور المؤقتة فقط (إن وجدت)
    res.status(200).json({
      tempPassword: user.tempPassword || null,
      hasPassword: !!user.password,
      username: user.username,
    });
  } catch (error) {
    console.error("❌ Error fetching password:", error);
    res.status(500).json({ message: "Failed to fetch password" });
  }
});

/* ============================================================
   🚫 إيقاف/تفعيل حساب مستخدم (Admin فقط)
============================================================ */
router.put("/users/:userId/suspend", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { userId } = req.params;
    const { isSuspended } = req.body;
    const currentUserId = req.user.userId?.toString() || req.user.userId;

    // منع إيقاف نفسه
    if (userId === currentUserId || userId.toString() === currentUserId) {
      return res.status(400).json({ message: "❌ لا يمكنك إيقاف حسابك الخاص" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isSuspended: isSuspended !== undefined ? isSuspended : true },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "❌ المستخدم غير موجود" });
    }

    res.status(200).json({
      message: user.isSuspended ? "✅ تم إيقاف الحساب بنجاح" : "✅ تم تفعيل الحساب بنجاح",
      user,
    });
  } catch (error) {
    console.error("❌ Error suspending user:", error);
    res.status(500).json({ message: "Failed to suspend user" });
  }
});

/* ============================================================
   🔐 تغيير كلمة المرور (للمستخدم)
============================================================ */
router.put("/change-password", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "❌ يجب إدخال كلمة المرور الحالية والجديدة" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "❌ المستخدم غير موجود" });
    }

    // التحقق من كلمة المرور الحالية
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "❌ كلمة المرور الحالية غير صحيحة" });
    }

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // تحديث كلمة المرور وسجل التغييرات
    user.password = hashedPassword;
    user.lastPasswordChange = new Date();
    user.passwordHistory.push({
      changedAt: new Date(),
      changedBy: 'user',
    });
    user.tempPassword = null; // حذف كلمة المرور المؤقتة
    await user.save();

    res.status(200).json({ message: "✅ تم تغيير كلمة المرور بنجاح" });
  } catch (error) {
    console.error("❌ Error changing password:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

/* ============================================================
   📜 جلب سجل تغييرات كلمة المرور (Admin فقط)
============================================================ */
router.get("/users/:userId/password-history", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const user = await User.findById(req.params.userId).select("passwordHistory lastPasswordChange");
    if (!user) {
      return res.status(404).json({ message: "❌ المستخدم غير موجود" });
    }

    res.status(200).json({
      passwordHistory: user.passwordHistory || [],
      lastPasswordChange: user.lastPasswordChange,
    });
  } catch (error) {
    console.error("❌ Error fetching password history:", error);
    res.status(500).json({ message: "Failed to fetch password history" });
  }
});

module.exports = router;
