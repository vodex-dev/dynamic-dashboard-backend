const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const pageRoutes = require("./routes/pageRoutes");
const fieldRoutes = require("./routes/fieldRoutes");
const sectionRoutes = require("./routes/sectionRoutes");


const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/pages", pageRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/sections", sectionRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("❌ Database connection error:", err));
