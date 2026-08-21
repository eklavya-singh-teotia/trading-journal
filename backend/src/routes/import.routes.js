import express from "express";
import multer from "multer";
import { uploadUpstoxCsv } from "../controllers/import.controller.js";
import { verifyJWT } from "../middlewares/auth.js";

const router = express.Router();

// Memory storage keeps file buffer in RAM without writing to disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB Limit
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = [".csv", ".xlsx", ".xls"];
        const allowedMimetypes = [
            "text/csv",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
        ];

        const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf("."));
        if (allowedMimetypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error("Only .csv, .xlsx, and .xls files are supported!"), false);
        }
    },
});

router.post("/csv", verifyJWT, upload.single("file"), uploadUpstoxCsv);

export default router;
