const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

// تحميل المتغيرات من .env
dotenv.config();

// استيراد الراوتات
const authRoutes = require("./routes/authRoutes");
const pageRoutes = require("./routes/pageRoutes");
const fileRoutes = require("./routes/fileRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const collectionItemRoutes = require("./routes/collectionItemRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// استخدام الراوتات
app.use("/api/auth", authRoutes);
app.use("/api/pages", pageRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/collection-items", collectionItemRoutes);
app.use("/api/upload", uploadRoutes); // روت رفع الملفات إلى Cloudflare R2

// الاتصال بقاعدة البيانات
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("❌ Database connection error:", err));
