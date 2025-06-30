const express = require("express");
const {
  getAllOrganizations,
  getAllPractices,
  updateUserMapping,
  getProviders,
} = require("../controllers/providerController");
const router = express.Router();

router.get("/allOrganizations", getAllOrganizations);
router.get("/allPractices", getAllPractices);
router.post("/updatePhysicianMappings", updateUserMapping);
router.get("/getProviders", getProviders);

module.exports = router;
