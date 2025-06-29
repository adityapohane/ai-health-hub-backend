const express = require("express");
const {
  getAllOrganizations,
  getAllPractices,
  updateUserMapping,
} = require("../controllers/providerController");
const router = express.Router();

router.get("/allOrganizations", getAllOrganizations);
router.get("/allPractices", getAllPractices);
router.post("/updatePhysicianMappings", updateUserMapping);

module.exports = router;
