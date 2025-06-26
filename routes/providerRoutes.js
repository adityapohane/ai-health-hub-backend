const express = require("express")
const { getAllOrganizations } = require("../controllers/providerController")
const router = express.Router()


router.get("/organizations", getAllOrganizations)



module.exports = router