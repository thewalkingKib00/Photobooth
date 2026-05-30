import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// In-memory store for photo sessions (persistent while server runs)
const photoSessionsStore = new Map<string, {
  photo: string; // base64 string with headers
  gif?: string;
  video?: string;
  createdAt: number;
}>();

// In-memory store for transactions & paper stock
const transactionsList: any[] = [
  { id: "TX-1001", date: new Date(Date.now() - 3600000 * 2).toISOString(), frameName: "Classic Pastel Pink", quantity: 2, amount: 25000, paymentMethod: "QRIS", status: "SUCCESS", printStatus: "PRINTED" },
  { id: "TX-1002", date: new Date(Date.now() - 3600000).toISOString(), frameName: "Cyberpunk Neon Grid", quantity: 1, amount: 15000, paymentMethod: "DANA", status: "SUCCESS", printStatus: "PRINTED" },
  { id: "TX-1003", date: new Date().toISOString(), frameName: "Retro Monochrom", quantity: 3, amount: 35000, paymentMethod: "QRIS", status: "SUCCESS", printStatus: "QUEUED" }
];

let paperStockData = {
  current: 120,
  capacity: 200,
  lowThreshold: 20
};

let appSettings = {
  countdownSeconds: 5,
  priceBase: 15000,
  priceExtraCopy: 10000,
  spreadsheetUrl: "",
  printerBluetoothName: "Paper Booth Thermal Printer 58mm",
  isPrinterConnected: false,
  boothName: "SNAPBOX PRO",
  sessionTimeoutSeconds: 60,
  qrisPayload: "00020101021226300016COM.QRIS.DEPOSIT01189360052000123456785204581253033605405150005802ID5913SNAPBOX_BOOTH6007JAKARTA6304D1B9"
};

// Auto cleanup old photos (> 1 hour) every 10 minutes to maintain memory health
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [id, value] of photoSessionsStore.entries()) {
    if (value.createdAt < oneHourAgo) {
      photoSessionsStore.delete(id);
    }
  }
}, 600000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size for base64 high-res photos
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API: Get Photo for Instant QR Code Download
  app.get("/api/photo/:id", (req, res) => {
    const session = photoSessionsStore.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Photo not found or expired (expired after 1 hour)" });
    }
    res.json({
      photo: session.photo,
      gif: session.gif,
      video: session.video
    });
  });

  // API: Save Photo session
  app.post("/api/photo", (req, res) => {
    const { photo, gif, video } = req.body;
    if (!photo) {
      return res.status(400).json({ error: "Missing photo content" });
    }
    const downloadId = "PBOX" + Math.random().toString(36).substring(2, 8).toUpperCase();
    photoSessionsStore.set(downloadId, {
      photo,
      gif,
      video,
      createdAt: Date.now()
    });
    res.json({ downloadId });
  });

  // API: Get Transactions
  app.get("/api/transactions", (req, res) => {
    res.json(transactionsList);
  });

  // API: Add Transaction
  app.post("/api/transactions", (req, res) => {
    const { frameName, quantity, amount, paymentMethod, status, printStatus } = req.body;
    const newTx = {
      id: "TX-" + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString(),
      frameName: frameName || "Classic Frame",
      quantity: quantity || 2,
      amount: amount || 25000,
      paymentMethod: paymentMethod || "QRIS",
      status: status || "SUCCESS",
      printStatus: printStatus || "QUEUED"
    };
    transactionsList.unshift(newTx);

    // If printing succeeded or queued, decrement paper stock
    if (printStatus !== "NOT_PRINTED") {
      paperStockData.current = Math.max(0, paperStockData.current - (quantity || 2));
    }

    res.json({ success: true, transaction: newTx, stock: paperStockData });
  });

  // API: Get Stock
  app.get("/api/stock", (req, res) => {
    res.json(paperStockData);
  });

  // API: Update Stock
  app.post("/api/stock", (req, res) => {
    const { current, capacity, lowThreshold } = req.body;
    if (typeof current === "number") paperStockData.current = current;
    if (typeof capacity === "number") paperStockData.capacity = capacity;
    if (typeof lowThreshold === "number") paperStockData.lowThreshold = lowThreshold;
    res.json(paperStockData);
  });

  // API: Get Settings
  app.get("/api/settings", (req, res) => {
    res.json(appSettings);
  });

  // API: Save Settings
  app.post("/api/settings", (req, res) => {
    const { countdownSeconds, priceBase, priceExtraCopy, spreadsheetUrl, printerBluetoothName, boothName, sessionTimeoutSeconds, qrisPayload } = req.body;
    if (typeof countdownSeconds === "number") appSettings.countdownSeconds = countdownSeconds;
    if (typeof priceBase === "number") appSettings.priceBase = priceBase;
    if (typeof priceExtraCopy === "number") appSettings.priceExtraCopy = priceExtraCopy;
    if (typeof spreadsheetUrl === "string") appSettings.spreadsheetUrl = spreadsheetUrl;
    if (typeof printerBluetoothName === "string") appSettings.printerBluetoothName = printerBluetoothName;
    if (typeof boothName === "string") appSettings.boothName = boothName;
    if (typeof sessionTimeoutSeconds === "number") appSettings.sessionTimeoutSeconds = sessionTimeoutSeconds;
    if (typeof qrisPayload === "string") appSettings.qrisPayload = qrisPayload;
    res.json(appSettings);
  });

  // Vite Integration in Express
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA Wildcard Route
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BOOT] Photobox express server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
});
