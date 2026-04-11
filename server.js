// <= IMPORTS =>
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import connectDB from "./config/dbConnection.js";
import corsOptions from "./config/corsOptions.js";
import { logEvents } from "./middleware/logger.js";
import { getDirName } from "./utils/getDirName.js";
import { app, server } from "./services/socket.js";
import { errorHandler } from "./middleware/errorHandler.js";
import helmetMiddleware from "./middleware/helmetMiddleware.js";
import authRoutes from "./routes/authRoute.js";
import dashboardRoutes from "./routes/dashboadRoute.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import formulationRoute from "./routes/formulasRoute.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productionRoutes from "./routes/productionRoutes.js";

dotenv.config({});
connectDB();
const __dirname = getDirName(import.meta.url);
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmetMiddleware());
app.use("/", express.static(path.join(__dirname, "public")));
// ROOT ROUTE
app.use("/api",dashboardRoutes)
app.use("/api/auth",authRoutes)
app.use("/api/inventory",inventoryRoutes)
app.use("/api/formula",formulationRoute)
app.use("/api/category",categoryRoutes)
app.use("/api/category",categoryRoutes)
app.use("/api/production",productionRoutes)

app.all("*", (req, res) => {
  // SETTING STATUS
  res.status(404);
  // RESPONSE HANDLING
   if (req.accepts("json")){
    // JSON RESPONSE
    res.json({ message: "404 : The requested Route does not exist" });
  }else {
    // TEXT RESPONSE
    res.type("txt").send("404 : Page Not Found");
  }
});

app.use(errorHandler);

mongoose.connection.once("open", () => {
  console.log("Database Connection Established Successfully");
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

mongoose.connection.on("error", (err) => {
  console.log(err);
  logEvents(
    `${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
    "mongoErrLog.log"
  );
});
