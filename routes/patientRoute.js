const express = require("express")
const router = express.Router()
const { addPatient, getPatientDataById, editPatientDataById, getAllPatients, getPatientMonitoringData, getPatientByPhoneNumber, getPatientTaskDetails, addPatientTask, getAllPatientTasks, editPatientTask } = require("../controllers/patientCtrl")
const { resetPasswordTokenCtrl, resetPasswordCtrl } = require("../controllers/resetPasswordCtrl")


router.post("/create", addPatient);
router.post("/getPatientDataById", getPatientDataById);
router.post("/getPatientByPhoneNumber", getPatientByPhoneNumber);
router.post("/editPatientDataById", editPatientDataById);
router.get("/getAllPatients", getAllPatients);
router.get("/getPatientMonitoringData", getPatientMonitoringData);
router.get("/getPatientTaskDetails", getPatientTaskDetails);
router.post("/addPatientTask", addPatientTask);
router.get("/getAllPatientTasks", getAllPatientTasks);
router.post("/editPatientTask", editPatientTask);


module.exports = router