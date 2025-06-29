const express = require("express")
const router = express.Router()
const AWS = require('aws-sdk');
const fs = require('fs');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});


const path = require('path');

router.post('/upload-video', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).send('No file uploaded.');
    }

    const uploadedFile = req.files.file;
    const fileName = uploadedFile.name;
    const fileExtension = path.extname(fileName).toLowerCase();

    // Validate file types
    const validExtensions = ['.pdf', '.mp4', '.mov', '.webm'];
    if (!validExtensions.includes(fileExtension)) {
      return res.status(400).send('Invalid file type.');
    }

    const uploadPath = path.join(__dirname, '../uploads', fileName);

    // 1. Save file to server
    await uploadedFile.mv(uploadPath);

    // 2. Upload from disk
    const fileStream = fs.createReadStream(uploadPath);

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `uploads/${fileName}`,
      Body: fileStream,
      ContentType: uploadedFile.mimetype, // Important: PDF must be 'application/pdf'
    };

    const uploadResult = await s3.upload(params).promise();

    // 3. Clean up local file
    fs.unlinkSync(uploadPath);
console.log(uploadResult)
    res.status(200).json({
      message: 'File uploaded successfully!',
      fileUrl: uploadResult.Location,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).send('Error uploading file to S3.');
  }
});



module.exports = router
