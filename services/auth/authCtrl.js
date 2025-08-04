const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connection = require('../../config/db');
const mailSender = require("../../utils/mailSender");
const otpTemplate = require("../../template/emailVerificationTemplate");
const crypto = require("crypto");
const logAudit = require('../../utils/logAudit');

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

    // Log user registration
    await logAudit(req, 'CREATE', 'USER', insertedId, `User registered with email: ${email}`);

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
    // Log successful login attempt with OTP sent
    await logAudit(req, 'UPDATE', 'USER_AUTH', user.user_id, `User login initiated, OTP sent to email: ${email}`);

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

    // Log password change
    await logAudit(req, 'UPDATE', 'USER_SECURITY', user_id, `User password changed successfully`);

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
    req.user = user;
    // Log successful MFA verification and login
    await logAudit(req, 'UPDATE', 'USER_AUTH', user_id, `MFA verified successfully, user logged in: ${user.username}`);
    
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

// SEND RESET PASSWORD EMAIL
const resetPasswordTokenCtrl = async (req, res) => {
  try {
    const email = req.body.email;

    // Find user by email
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE username = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: `This Email: ${email} is not registered.`,
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expires = Date.now() + 3600000; // 1 hour from now

    await connection.execute(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE username = ?",
      [token, expires, email]
    );

    const url = `http://localhost:8080/update-password/${token}`;
    await mailSender(
      email,
      "Password Reset",
      `Your link to reset the password: ${url}. Please click this link to continue.`
    );

    // Log password reset request
    const user = rows[0];
    await logAudit(req, 'UPDATE', 'USER_SECURITY', user.user_id, `Password reset token requested for email: ${email}`);

    return res.json({
      success: true,
      message: "Email sent successfully. Check your inbox.",
    });
  } catch (error) {
    console.error("Error while sending password reset email:", error);
    return res.json({
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

    // Find user by token
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE reset_token = ?",
      [token]
    );

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "Token is invalid.",
      });
    }

    const user = rows[0];

    // Check if token is expired
    if (user.reset_token_expires < Date.now()) {
      return res.status(403).json({
        success: false,
        message: "Token has expired. Please request a new one.",
      });
    }

    // Hash new password
    const encryptedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear token fields
    await connection.execute(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = ?",
      [encryptedPassword, token]
    );

    // Log successful password reset
    await logAudit(req, 'UPDATE', 'USER_SECURITY', user.user_id, `Password reset completed using token for user: ${user.username}`);

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

const registerProvider = async (req,res)=>{
try {
    const {firstName,lastName,email,phone} = req.body;
    if(!firstName || !lastName || !email || !phone){
        return res.status(400).json({
            success:false,
            message:"All fields are required"
        })
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
        const insertQuery = "INSERT INTO users (username, password,fk_roleid) VALUES (?, null,6)";
        const values = [email];
        const [result] = await connection.query(insertQuery, values);
        const userprofileQ = "INSERT INTO user_profiles (firstname,lastname,work_email,phone,fk_userid) VALUES (?,?,?,?,?)";
        const userprofileValues = [firstName,lastName,email,phone,result.insertId];
        const [userprofileResult] = await connection.query(userprofileQ, userprofileValues);
        const token = jwt.sign(
          { username: email, user_id: result.insertId,roleid:6 },
          process.env.JWT_SECRET
        );
        let PASSWORD_LINK = `${process.env.PROVIDER_VERIFICATION_LINK}/provider-verfy?token=${token}`;
        let emailBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #f9f9f9; color: #333;">
  <div style="background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
    <h2 style="color: #2c3e50;">Welcome to YourApp!</h2>
    <p>Hi there,</p>
    <p>You’ve been invited to set up your password for your new account with <strong>YourApp</strong>.</p>
    <p>Click the button below to create your password and access your account:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${PASSWORD_LINK}" style="
        background-color: #007bff;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
        display: inline-block;
      ">Set Your Password</a>
    </div>

    <p>If the button above doesn’t work, you can also copy and paste this URL into your browser:</p>
    <p style="word-break: break-all;">
      <a href="${PASSWORD_LINK}" style="color: #007bff;">${PASSWORD_LINK}</a>
    </p>

    <p>This link will expire in 24 hours for your security.</p>
    <p>If you did not expect this email, you can safely ignore it.</p>

    <hr style="margin: 30px 0;">
    <p style="font-size: 12px; color: #888;">
      Need help? Contact our support team at <a href="mailto:support@yourapp.com">support@yourapp.com</a>.
    </p>
  </div>
</div>
`
        let update1 = `UPDATE users SET user_token = ?, modified = CURRENT_TIMESTAMP WHERE user_id = ?;`
        const result1 = await connection.query(update1, [token, result.insertId]);
        // Log successful login attempt with OTP sent
        mailSender(email,"AI Health Hub – Provider Verification",emailBody);
        await logAudit(req, 'CREATE', 'USER_AUTH', result.insertId, `User login initiated, OTP sent to email: ${email}`);
        return res.status(200).json({
          success: true,
          token,
          message: "OTP sent successfully"
        });
} catch (error) {
    console.log(error)
    return res.status(500).json({
        success: false,
        message: "Error in registerProvider",
        error: error.message
    })
}
}

const setProviderPasswordCtrl = async (req, res) => {
  const { password, confirmPassword, token } = req.body;

  // 1. Validate password match
  if (!password || !confirmPassword || !token) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }

  try {
    // 2. Check if token exists in users table
    const [rows] = await connection.query(
      'SELECT * FROM users WHERE user_token = ? LIMIT 1',
      [token]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    const userId = rows[0].user_id;

    // 3. Hash password and update
    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.query(
      'UPDATE users SET password = ?, user_token = NULL WHERE user_id = ?',
      [hashedPassword, userId]
    );

    await logAudit(req, 'UPDATE', 'USER_AUTH', userId, `User password set successfully`);

    return res.status(200).json({
      success: true,
      message: 'Password set successfully.',
    });
  } catch (err) {
    console.error('Error setting password:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};



module.exports = {
  registerCtrl,
  loginCtrl,
  changePasswordCtrl,
  verifyOtpCtrl,
  resetPasswordCtrl,
  resetPasswordTokenCtrl,
  registerProvider,
  setProviderPasswordCtrl
};
