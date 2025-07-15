const bcrypt = require("bcryptjs");
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

module.exports = {
    documentTypeCtrl
}