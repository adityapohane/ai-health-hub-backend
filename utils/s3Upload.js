const AWS = require('../config/awsConfig');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3();

/**
 * Upload a file to S3
 * @param {string} filePath - Local file path (e.g. './uploads/image.png')
 * @param {string} bucketName - S3 bucket name
 * @param {string} key - Target key name in S3 (e.g. 'images/image.png')
 * @returns {Promise<string>} - Uploaded file URL
 */
const uploadFileToS3 = async (filePath, bucketName, key) => {
  try {
    const fileContent = fs.readFileSync(filePath);

    const params = {
      Bucket: bucketName,
      Key: key || path.basename(filePath),
      Body: fileContent
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (err) {
    console.error('S3 Upload Error:', err);
    throw err;
  }
};

module.exports = uploadFileToS3;
