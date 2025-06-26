const express = require("express")
const { registerCtrl, loginCtrl } = require("../controllers/authCtrl")
const router = express.Router()


router.post("/login", loginCtrl)
router.post("/signup", registerCtrl)



module.exports = router