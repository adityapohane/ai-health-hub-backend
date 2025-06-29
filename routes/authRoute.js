const express = require("express")
const { registerCtrl, loginCtrl, changePasswordCtrl } = require("../controllers/authCtrl")
const { verifyToken } = require("../middleware/auth")
const router = express.Router()


router.post("/login", loginCtrl)
router.post("/signup", registerCtrl)
router.post("/change-password",verifyToken, changePasswordCtrl)



module.exports = router