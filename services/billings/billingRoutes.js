const express = require('express');
const router = express.Router();

const { getAllPatients, updateBillingStatus,getFormInformationForCms,sendForClaim } = require('./billingCtrl');

router.get('/patients', getAllPatients);
router.post('/update-billing-status', updateBillingStatus);


router.post("/get-form-information-for-cms",getFormInformationForCms)
router.post("/send-for-claim",sendForClaim)
module.exports = router;
