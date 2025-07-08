const express = require("express")
const { registerCtrl, loginCtrl, changePasswordCtrl, verifyOtpCtrl } = require("../controllers/authCtrl");
const { resetPasswordCtrl, resetPasswordTokenCtrl } = require("../controllers/resetPasswordCtrl");
const { verifyToken } = require("../middleware/auth")
const router = express.Router()


router.post("/login", loginCtrl)
router.post("/signup", registerCtrl)
router.post("/reset-password", resetPasswordCtrl)
router.post("/reset-password-token", resetPasswordTokenCtrl)
router.post("/change-password",verifyToken, changePasswordCtrl)
router.post("/verify-otp", verifyOtpCtrl)




module.exports = router