const express = require('express');
const router = express.Router();
const { createEncounterTemplate, getEncounterTemplates, getEncounterTemplateById, updateTemplateById, deleteTemplateById, getAllEncounters, createEncounter, getEncounterById, deleteEncounterById,updateEncounterById } = require('./encounterController');


router.post('/template/create', createEncounterTemplate);
router.get('/template/get', getEncounterTemplates);
router.get('/template/get/:template_id', getEncounterTemplateById);
router.post('/template/update/:template_id', updateTemplateById);
router.delete('/template/delete/:template_id', deleteTemplateById);
router.get('/get', getAllEncounters);
router.post('/create', createEncounter);
router.get('/get/:encounter_id', getEncounterById);
router.post('/update/:encounter_id', updateEncounterById);
router.delete('/delete/:encounterId', deleteEncounterById);


module.exports = router;
