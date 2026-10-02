import express from "express";
import cors from "cors";
import requestLogger from "./middleware/requestLogger";
import errorMiddleware from "./middleware/errorMiddleware";
import propertyRoutes from "./routes/propertyRoutes";
import propertyActivityRoutes from "./routes/propertyActivityRoutes";
import noteRoutes from "./routes/noteRoutes";
import siteVisitRoutes from "./routes/siteVisitRoutes";
import chatRoutes from "./routes/chatRoutes";
import masterDataRoutes from "./routes/masterDataRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import exportRoutes from "./routes/exportRoutes";

const app = express();
let databaseReady = false;
const allowedOrigins = [
  "http://localhost:9430",
  "http://127.0.0.1:9430",
  "https://customer-relationship-management-sy-nine.vercel.app",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    status: databaseReady ? "ready" : "database_unavailable",
    message: databaseReady
      ? "CRM API is ready"
      : "CRM API is running but the database is not ready",
  });
});

export const setDatabaseReady = (ready: boolean) => {
  databaseReady = ready;
};

app.use("/api/properties", propertyRoutes);
app.use("/api/property-activities", propertyActivityRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/site-visits", siteVisitRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/master-data", masterDataRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/export", exportRoutes);

app.use(errorMiddleware);

export default app;