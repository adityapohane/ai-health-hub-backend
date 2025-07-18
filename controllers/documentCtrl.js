const connection = require("../config/db");
const moment = require('moment');
const uploadFileToS3 = require("../utils/s3Upload.js");
const fs = require("fs");
const path = require("path");


const documentTypeCtrl = async (req, res) => {
  try {
    const sql = `SELECT * FROM document_types`
    const [types] = await connection.query(sql);
    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      types
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Document cannot be uploaded. Please try again.",
    });
  }
};
const getDocumentsByPatientIdCtrl = async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
      error: "Please provide patient_id",
    });
  }
  try {
    const sql = `SELECT * FROM patient_documents WHERE patient_id = ?`
    const [types] = await connection.query(sql, [patientId]);
    return res.status(200).json({
      success: true,
      message: "Document fetched successfully",
      types
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Document cannot be uploaded. Please try again.",
    });
  }
};

const documentUploadCtrl = async (req, res) => {
  try {
    const file = req.files?.pdf;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
        error: "Please upload a PDF file",
      });
    }

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File too large",
        error: "File size exceeds 5MB limit",
      });
    }

    const { patient_id, document_type_id, description } = {
      ...req.body,
      ...req.query,
    };

    if (!patient_id || !document_type_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        error: "Please provide patient_id and document_type_id",
      });
    }

    const tempPath = file.tempFilePath;
    const fileName = `${patient_id}/${Date.now()}_${file.name}`;

    // Upload to S3 from temp path
    const s3Response = await uploadFileToS3(tempPath, process.env.BUCKET_NAME, fileName);
    const aws_url = s3Response;

    console.log(s3Response)
    // Save metadata in DB
    const [result] = await connection.execute(
      `INSERT INTO patient_documents 
        (patient_id, document_type_id, description, aws_url, status)
       VALUES (?, ?, ?, ?, ?)`,
      [patient_id, document_type_id, description || "", aws_url, 3]
    );

    // Delete temp file after upload
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      document_id: result.insertId,
      aws_url,
    });

  } catch (err) {
    console.error("Document upload error:", err);

    // Cleanup temp file on error
    try {
      if (req.files?.pdf?.tempFilePath && fs.existsSync(req.files.pdf.tempFilePath)) {
        fs.unlinkSync(req.files.pdf.tempFilePath);
      }
    } catch (cleanupError) {
      console.error("File cleanup error:", cleanupError);
    }

    res.status(500).json({
      success: false,
      message: "Document upload failed",
      error: err.message || "Unexpected error",
    });
  }
};

module.exports = {
  documentTypeCtrl,
  documentUploadCtrl,
  getDocumentsByPatientIdCtrl
}
