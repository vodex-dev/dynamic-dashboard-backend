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

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("❌ Database connection error:", err));
