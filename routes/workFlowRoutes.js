const express = require('express');
const router = express.Router();
const controller = require('../controllers/workFlowTemplatesCtrl');


router.post('/create', controller.createWorkflow);
router.get('/provider/:providerId', controller.getByProvider);
router.put('/update/:id', controller.updateWorkflow);
router.delete('/delete/:id', controller.deleteWorkflow);

module.exports = router;
