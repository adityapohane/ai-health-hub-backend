const express = require("express");
const {
  getAllOrganizations,
  getAllPractices,
  updateUserMapping,
  getProviders,
  updateProviderInformation,
  getProviderInformation,
  addPatientBillingNote,
  providerDashboardCount,
  patientsMedications
} = require("./providerController");
const router = express.Router();

router.get("/allOrganizations", getAllOrganizations);
router.get("/allPractices", getAllPractices);
router.post("/updatePhysicianMappings", updateUserMapping);
router.get("/getProviders", getProviders);
router.put("/updateProviderInformation", updateProviderInformation)
router.get("/getProviderInformation", getProviderInformation)
router.post("/addPatientTimedDetails", addPatientBillingNote)
router.get("/providerDashboardCount", providerDashboardCount)
router.get("/patientsMedications", patientsMedications)

module.exports = router;
