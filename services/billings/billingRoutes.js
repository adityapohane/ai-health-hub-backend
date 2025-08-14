const express = require('express');
const router = express.Router();

const { getAllPatients, updateBillingStatus,getFormInformationForCms,sendForClaim,saveClaim,checkEligibility } = require('./billingCtrl');

router.get('/patients', getAllPatients);
router.post('/update-billing-status', updateBillingStatus);


router.post("/get-form-information-for-cms",getFormInformationForCms);
router.post("/save-claim",saveClaim);
router.post("/send-for-claim",sendForClaim)
router.post("/check-eligibility",checkEligibility);
module.exports = router;
