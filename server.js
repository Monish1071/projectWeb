// Required Modules
const express = require("express");
const multer = require("multer");
const mysql = require("mysql2");
const cors = require("cors");
const fs = require("fs");
const excelJS = require("exceljs");
const pdfkit = require("pdfkit");
const path = require("path");
const net = require("net");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads")); // Serve uploaded files

// 🔹 Logging Function for Better Debugging
const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

// 🔹 MySQL Database Connection with Auto-Reconnect
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "Dvr1978.", // Change accordingly
  database: "maintenance_db",
  multipleStatements: true,
};

let db;
function handleDisconnect() {
  db = mysql.createConnection(dbConfig);
  db.connect((err) => {
    if (err) {
      log("❌ Database connection failed. Retrying in 5 seconds...");
      setTimeout(handleDisconnect, 5000); // Retry after 5s
    } else {
      log("✅ MySQL Connected");
    }
  });

  db.on("error", (err) => {
    log(`❌ MySQL Error: ${err.code}`);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      handleDisconnect(); // Reconnect on connection loss
    }
  });
}
handleDisconnect();

// 🔹 Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// 🔹 Submit Requisition (Form Submission)
app.post("/submit", upload.single("proof"), (req, res) => {
  log("📥 Incoming requisition request...");
  log(`Body: ${JSON.stringify(req.body)}`);
  log(`File: ${req.file ? req.file.filename : "No file uploaded"}`);

  const { reg_no, name, block, room, work_type, list_type, comments } = req.body;
  const proof = req.file ? req.file.filename : null;

  const sql = `
    INSERT INTO requisitions (reg_no, name, block, room, work_type, list_type, comments, proof)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [reg_no, name, block, room, work_type, list_type, comments, proof];

  db.query(sql, values, (err, result) => {
    if (err) {
      log(`❌ SQL Insert Error: ${err}`);
      return res.status(500).json({ error: "Database error" });
    }
    log(`✅ Requisition submitted: ${result.insertId}`);
    res.json({ message: "Requisition submitted successfully!" });
  });
});

// 🔹 Generate Excel Report
app.get("/report/excel", (req, res) => {
  db.query("SELECT * FROM requisitions", (err, results) => {
    if (err) return res.status(500).json(err);

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Requisitions");

    worksheet.columns = [
      { header: "Reg No", key: "reg_no" },
      { header: "Name", key: "name" },
      { header: "Block", key: "block" },
      { header: "Room", key: "room" },
      { header: "Work Type", key: "work_type" },
      { header: "List Type", key: "list_type" },
      { header: "Comments", key: "comments" },
    ];

    worksheet.addRows(results);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=report.xlsx");

    workbook.xlsx.write(res).then(() => res.end());
  });
});

// 🔹 Generate PDF Report
app.get("/report/pdf", (req, res) => {
  db.query("SELECT * FROM requisitions", (err, results) => {
    if (err) return res.status(500).json(err);

    const doc = new pdfkit();
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);
    doc.fontSize(18).text("Maintenance Requisition Report", { align: "center" }).moveDown();

    results.forEach((req) => {
      doc
        .fontSize(12)
        .text(`Reg No: ${req.reg_no}`)
        .text(`Name: ${req.name}`)
        .text(`Block: ${req.block}`)
        .text(`Room: ${req.room}`)
        .text(`Work Type: ${req.work_type}`)
        .text(`List Type: ${req.list_type}`)
        .text(`Comments: ${req.comments}`)
        .moveDown();
    });

    doc.end();
  });
});

// 🔹 Fix Port in Use (Auto-Kill Process)
const server = net.createServer();
server.once("error", (err) => {
  if (err.code === "EADDRINUSE") {
    log(`❌ Port ${PORT} is in use. Trying to free it...`);
    exec(`kill $(lsof -t -i:${PORT})`, () => {
      log(`✅ Port ${PORT} freed. Restarting server...`);
      startServer();
    });
  }
});
server.once("listening", () => {
  server.close();
  startServer();
});
server.listen(PORT);

// 🔹 Start Express Server
function startServer() {
  app.listen(PORT, () => {
    log(`🚀 Server running on port ${PORT}`);
  });
}
