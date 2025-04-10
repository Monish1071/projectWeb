// Backend: Node.js + Express + MySQL
const express = require("express");
const multer = require("multer");
const mysql = require("mysql2");
const cors = require("cors");
const fs = require("fs");
const excelJS = require("exceljs");
const pdfkit = require("pdfkit");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

// MySQL Database Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Dvr1978.", // Change accordingly
  database: "maintenance_db",
});

db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected");
});

// File Upload Setup
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Submit Requisition
app.post("/submit", upload.single("proof"), (req, res) => {
  const { reg_no, name, block, room, work_type, list_type, comments } = req.body;
  const proof = req.file ? req.file.filename : null;

  const sql = "INSERT INTO requisitions (reg_no, name, block, room, work_type, list_type, comments, proof) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  const values = [reg_no, name, block, room, work_type, list_type, comments, proof];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Requisition submitted successfully!" });
  });
});

// Generate Excel Report
app.get("/report/excel", (req, res) => {
  const sql = "SELECT * FROM requisitions";
  db.query(sql, (err, results) => {
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
    return workbook.xlsx.write(res).then(() => res.end());
  });
});

// Generate PDF Report
app.get("/report/pdf", (req, res) => {
  const sql = "SELECT * FROM requisitions";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);

    const doc = new pdfkit();
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);
    doc.text("Maintenance Requisition Report", { align: "center" });
    results.forEach((req) => {
      doc.text(`${req.reg_no} | ${req.name} | ${req.block} | ${req.room} | ${req.work_type} | ${req.list_type} | ${req.comments}`);
    });
    doc.end();
  });
});

// Start Server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
