const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const pageRoutes = require("./routes/pageRoutes");
const fieldRoutes = require("./routes/fieldRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const collectionItemRoutes = require("./routes/collectionItemRoutes");
const uploadRoutes = require("./routes/uploadRoutes"); // ✅ الصحيح
const collectionUploadRoutes = require("./routes/collectionUploadRoutes");
const formRoutes = require("./routes/forms");
const planRoutes = require("./routes/plans");
const subscriptionRoutes = require("./routes/subscriptions");
const settingsRoutes = require("./routes/settingsRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const couponRoutes = require("./routes/couponRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/pages", pageRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/collection-items", collectionItemRoutes);
app.use("/api/upload", uploadRoutes); // ✅ مسار رفع الصور إلى Cloudflare R2
app.use("/api/collection-uploads", collectionUploadRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/coupons", couponRoutes);

// Start server even if MongoDB connection fails (for development)
const startServer = () => {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
};

// Try to connect to MongoDB with timeout
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
    });
    console.log("✅ Connected to MongoDB");
    startServer();
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
    console.log("⚠️  Starting server without MongoDB connection...");
    console.log("⚠️  Some features may not work until MongoDB is connected");
    startServer();
  }
};

connectDB();
