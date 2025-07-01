const express = require("express")
const router = express.Router()
const {
      addPatient,
      getPatientDataById,
      editPatientDataById,
      getAllPatients,
      getPatientMonitoringData,
      getPatientByPhoneNumber,
      getPatientTaskDetails, addPatientTask, getAllPatientTasks, editPatientTask, getPcmByPatientId, getCcmByPatientId, addPatientDiagnosis, getPatientDiagnosis, addPatientNotes, getPatientNotes } = require("../controllers/patientCtrl")
const { resetPasswordTokenCtrl, resetPasswordCtrl } = require("../controllers/resetPasswordCtrl")


router.post("/create", addPatient);
router.get("/getPatientDataById", getPatientDataById);
router.post("/getPatientByPhoneNumber", getPatientByPhoneNumber);
router.post("/editPatientDataById", editPatientDataById);
router.get("/getAllPatients", getAllPatients);
router.get("/getPatientMonitoringData", getPatientMonitoringData);
router.get("/getPatientTaskDetails", getPatientTaskDetails);
router.post("/addPatientTask", addPatientTask);
router.get("/getAllPatientTasks", getAllPatientTasks);
router.post("/editPatientTask", editPatientTask);
router.get('/pcm-reports/:patientId', getPcmByPatientId);
router.get('/ccm-reports/:patientId', getCcmByPatientId);
router.post("/addPatientDiagnosis", addPatientDiagnosis);
router.get("/getPatientDiagnosis", getPatientDiagnosis);
router.post("/addPatientNotes", addPatientNotes);
router.get("/getPatientNotes", getPatientNotes);

module.exports = router