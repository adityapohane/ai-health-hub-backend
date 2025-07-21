const express = require("express")
const router = express.Router()
const AWS = require('aws-sdk');
const fs = require('fs');
const connection = require("../../config/db");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});


const path = require('path');

router.post('/upload-pdf/:patientId', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { patientId } = req.params;
    const { totalTime } = req.body;

    if (!req.body.type) {
      return res.status(400).json({ success: false, message: 'No file type provided.' });
    }
    const uploadedFile = req.files.file;
    const fileName = uploadedFile.name;
    const fileExtension = path.extname(fileName).toLowerCase();

    // Validate file types
    const validExtensions = ['.pdf', '.mp4', '.mov', '.webm'];
    if (!validExtensions.includes(fileExtension)) {
      return res.status(400).json({ success: false, message: 'Invalid file type.' });
    }

    const uploadPath = path.join(__dirname, '../uploads', fileName);

    // 1. Save file to local server
    await uploadedFile.mv(uploadPath);

    // 2. Upload from disk to S3
    const fileStream = fs.createReadStream(uploadPath);

    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `uploads/${fileName}`,
      Body: fileStream,
      ContentType: uploadedFile.mimetype,
    };

    const uploadResult = await s3.upload(params).promise();
    const pcmsql = `INSERT INTO pcm_mappings (patient, document_link, total_time) VALUES (?, ?, ?)`;
    const ccmsql = `INSERT INTO ccm_mappings (patient, document_link, total_time) VALUES (?, ?, ?)`;
    const sql = req.body.type === 'pcm' ? pcmsql : ccmsql;
    // 3. Insert into DB
    await connection.execute(sql,

      [patientId, uploadResult.Location, totalTime]
    );

    // 4. Clean up local file
    fs.unlinkSync(uploadPath);

    // 5. Return success response
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully!',
      fileUrl: uploadResult.Location,
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file to S3.',
      error: error.message || error,
    });
  }
});




module.exports = router
