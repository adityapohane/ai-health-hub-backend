const express = require("express");
const {
  getAllOrganizations,
  getAllPractices,
  updateUserMapping,
  getProviders,
  updateProviderInformation,
  getProviderInformation
} = require("../controllers/providerController");
const router = express.Router();

router.get("/allOrganizations", getAllOrganizations);
router.get("/allPractices", getAllPractices);
router.post("/updatePhysicianMappings", updateUserMapping);
router.get("/getProviders", getProviders);
router.get("updateProviderInformation", updateProviderInformation)
router.get("getProviderInformation", getProviderInformation)

module.exports = router;
