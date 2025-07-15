const connection = require("../config/db");
const moment = require('moment');
const uploadFileToS3 = require("../utils/s3Upload.js");

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

const documentUploadCtrl = async (req, res) => {
    try {
      console.log("File:", req.file);
      console.log("Body:", req.body);
      console.log("Query:", req.query);
  
      // Validate file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
          error: "Please upload a file",
        });
      }
  
      // Validate file size (5MB max)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "File too large",
          error: "File size exceeds 5MB limit",
        });
      }
  
      // Merge body + query
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
  
      // Upload file to S3
      const filePath = req.file.path || req.file.tempFilePath;
      const fileName = `${patient_id}/${Date.now()}_${req.file.originalname}`;
      const s3Response = await uploadFileToS3(filePath, "patient-documents", fileName);
      const aws_url = s3Response.Location;
  
      // Save in MySQL
      const [result] = await connection.execute(
        `INSERT INTO patient_documents 
          (patient_id, document_type_id, description, aws_url, status)
         VALUES (?, ?, ?, ?, ?)`,
        [patient_id, document_type_id, description, aws_url, 3] // 3 = hold
      );
  
      // Delete temp file (if applicable)
      try {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.error("File cleanup error:", cleanupError);
      }
  
      res.status(200).json({
        success: true,
        message: "Document uploaded successfully",
        document_id: result.insertId,
        aws_url,
      });
    } catch (err) {
        // Clean up temporary file on error
        try {
            if (req.file && req.file.path) {
                const fs = require('fs');
                fs.unlinkSync(req.file.path);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up temporary file:', cleanupError);
        }
        
        console.error('Document upload error:', err);
        res.status(500).json({
            success: false, 
            message: 'Document upload failed',
            error: err.message || 'An unexpected error occurred'
        });
    }
};

module.exports = {
    documentTypeCtrl,
    documentUploadCtrl
}
