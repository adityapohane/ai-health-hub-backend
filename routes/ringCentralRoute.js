const express = require("express")
const { createOrGetRingCentConfig, getRingCentConfigByProviderId } = require('../controllers/ringCentralConfig');
const router = express.Router()


// existing POST
router.post('/add-config', createOrGetRingCentConfig);

// new GET
router.get('/ring-cent-config/:provider_id', getRingCentConfigByProviderId);

module.exports = router