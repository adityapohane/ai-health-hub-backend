const express = require("express");
const router = express.Router();
const {documentTypeCtrl} = require("../controllers/documentCtrl");

router.get("/types", documentTypeCtrl);

module.exports = router;
