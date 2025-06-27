const express = require("express")
const { addPatient, getPatientDataById, editPatientDataById, getAllPatients, getPatientMonitoringData, getPatientByPhoneNumber } = require("../controllers/patientCtrl")
const { resetPasswordTokenCtrl, resetPasswordCtrl } = require("../controllers/resetPasswordCtrl")
const router = express.Router()


router.post("/create", addPatient);
router.post("/getPatientDataById", getPatientDataById);
router.post("/getPatientByPhoneNumber", getPatientByPhoneNumber);
router.post("/editPatientDataById", editPatientDataById);
router.get("/getAllPatients", getAllPatients);    
router.get("/getPatientMonitoringData", getPatientMonitoringData); 


module.exports = router