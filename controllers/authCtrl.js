const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connection = require('../config/db');
const mailSender = require("../utils/mailSender");
const otpTemplate = require("../template/emailVerificationTemplate");

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


const registerCtrl = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(403).send({
        success: false,
        message: "All required fields must be filled",
      });
    }

    // Check if user already exists
    const checkQuery = "SELECT * FROM users WHERE username = ?";
    const [existingRows] = await connection.query(checkQuery, [email]);

    if (existingRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User email already exists. Please sign in to continue.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

    const insertQuery = "INSERT INTO users (username, password,fk_roleid) VALUES (?, ?,6)";
    const values = [email, hashedPassword];
    const [result] = await connection.query(insertQuery, values);
    const insertedId = result.insertId;

    const insertUserProfileQuery = "INSERT INTO user_profiles (firstname,lastname,work_email,fk_userid) VALUES (?,?,?,?)";
    const userValues = [firstName, lastName, email, insertedId];
    const [userResult] = await connection.query(insertUserProfileQuery, userValues);


    return res.status(200).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "User cannot be registered. Please try again.",
    });
  }
};

const loginCtrl = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields.",
      });
    }


    let userQuery = `SELECT u.*, up.firstname, up.lastname, up.work_email FROM users u LEFT JOIN user_profiles up ON up.fk_userid = u.user_id WHERE u.username = ?`;
    const [rows] = await connection.query(userQuery, [email]);



    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User is not registered. Please sign up to continue.",
      });
    }

    let user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect.",
      });
    }

    const otp = generateOtp();

    const emailRes = await mailSender(
      email,
      "AI Health Hub – 2FA Code for Login",
      otpTemplate(otp)
        );


    const token = jwt.sign(
      { username: email, user_id: rows[0].user_id,roleid:rows[0].fk_roleid },
      process.env.JWT_SECRET
    );

    let update1 = `UPDATE users SET user_token = ?,mfa_code = ?, modified = CURRENT_TIMESTAMP WHERE user_id = ?;`
    const result1 = await connection.query(update1, [token,otp, user.user_id]);

    return res.status(200).json({
      success: true,
      token,
      message: "OTP sent successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};



const changePasswordCtrl = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const { user_id, username,roleid } = req.user; // Assuming you're using middleware to attach `req.user`
    if (!user_id) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide all password fields.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match.",
      });
    }

    // Fetch user
    const [users] = await connection.query("SELECT * FROM users WHERE user_id = ?", [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const user = users[0];

    const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await connection.query("UPDATE users SET password = ?, modified = CURRENT_TIMESTAMP WHERE user_id = ?", [
      hashedNewPassword,
      user_id,
    ]);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Error in changePasswordCtrl:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change password. Please try again later.",
    });
  }
};

const verifyOtpCtrl = async (req, res) => {
  const { otp, token } = req.body;

  try {
    // Use the same connection as the rest of the file
    const [rows] = await connection.query(
      `SELECT user_id, mfa_code FROM users WHERE user_token = ?`,
      [token]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found for this token.' });
    }

    const { mfa_code, user_id } = rows[0];

    if (mfa_code !== otp) {
      return res.status(401).json({ success: false, message: 'Invalid OTP.' });
    }

    // ✅ OTP matched – update user row
    await connection.query(
      `UPDATE users SET mfa_code = NULL, modified = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [user_id]
    );

    let userQuery = `SELECT u.*, up.firstname, up.lastname, up.work_email FROM users u LEFT JOIN user_profiles up ON up.fk_userid = u.user_id WHERE u.user_id = ?`;
    const [userResult] = await connection.query(userQuery, [user_id]);

    let user = userResult[0];
    // ✅ Send response ONLY if OTP is valid
    return res.status(200).json({
       success: true,
       token,
       user: {
         id: user.user_id,
         firstname: user.firstname,
         lastname: user.lastname,
         email: user.username,
         role: user.fk_roleid
       },
        message: 'MFA verified'
       });

  } catch (err) {
    console.error('MFA verification error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during MFA verification.' });
  }
};

module.exports = {
  registerCtrl,
  loginCtrl,
  changePasswordCtrl,
  verifyOtpCtrl
};
