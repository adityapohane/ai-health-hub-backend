const connection = require("../config/db");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// SEND RESET PASSWORD EMAIL
const resetPasswordTokenCtrl = async (req, res) => {
  try {
    const email = req.body.email;

    // Find patient by email inside JSON field (assuming email is top-level)
    const [rows] = await connection
      .promise()
      .query("SELECT * FROM patients WHERE JSON_UNQUOTE(JSON_EXTRACT(contactDetails, '$.email')) = ?", [email]);

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: `This Email: ${email} is not registered.`,
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expires = Date.now() + 3600000; // 1 hour

    await connection
      .promise()
      .query(
        "UPDATE patients SET token = ?, resetPasswordExpires = ? WHERE JSON_UNQUOTE(JSON_EXTRACT(contactDetails, '$.email')) = ?",
        [token, expires, email]
      );

    const url = `http://localhost:8080/update-password/${token}`;
    await mailSender(
      email,
      "Password Reset",
      `Your link to reset the password: ${url}. Please click this link to continue.`
    );

    res.json({
      success: true,
      message: "Email sent successfully. Check your inbox.",
    });
  } catch (error) {
    console.error("Error in resetPasswordTokenCtrl:", error);
    res.json({
      success: false,
      message: "Error sending password reset email.",
      error: error.message,
    });
  }
};

// RESET PASSWORD WITH TOKEN
const resetPasswordCtrl = async (req, res) => {
  try {
    const { password, confirmPassword, token } = req.body;

    if (password !== confirmPassword) {
      return res.json({
        success: false,
        message: "Password and Confirm Password do not match.",
      });
    }

    const [rows] = await connection
      .promise()
      .query("SELECT * FROM patients WHERE token = ?", [token]);

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "Token is invalid.",
      });
    }

    const user = rows[0];
    if (user.resetPasswordExpires < Date.now()) {
      return res.status(403).json({
        success: false,
        message: "Token has expired. Please request a new one.",
      });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    await connection
      .promise()
      .query("UPDATE patients SET password = ?, token = NULL, resetPasswordExpires = NULL WHERE token = ?", [
        encryptedPassword,
        token,
      ]);

    res.json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Error in resetPasswordCtrl:", error);
    res.json({
      success: false,
      message: "Error resetting password.",
      error: error.message,
    });
  }
};

module.exports = { resetPasswordTokenCtrl, resetPasswordCtrl };
