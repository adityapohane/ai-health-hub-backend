const express = require("express")
const router = express.Router()
const {
      addPatient,
      getPatientDataById,
      editPatientDataById,
      getAllPatients,
      getPatientMonitoringData,
      getPatientByPhoneNumber,
      getPatientTaskDetails, addPatientTask, getAllPatientTasks, editPatientTask, getPcmByPatientId, getCcmByPatientId, addPatientDiagnosis, getPatientDiagnosis, addPatientNotes, getPatientNotes, getUpcomingAndOverdueTasks, addPatientAllergy, addPatientInsurance, addPatientMedication, getPatientTimings, 
      addPatientVitals, fetchDataByPatientId, fetchDataByPatientIdForccm,searchPatient,getAllTasks} = require("./patientCtrl")


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
router.get("/getUpcomingAndOverdueTasks", getUpcomingAndOverdueTasks);

router.get('/pcm-reports/:patientId', getPcmByPatientId);
router.get('/ccm-reports/:patientId', getCcmByPatientId);
router.post("/addPatientDiagnosis", addPatientDiagnosis);
router.get("/getPatientDiagnosis", getPatientDiagnosis);
router.post("/addPatientNotes", addPatientNotes);
router.get("/getPatientNotes", getPatientNotes);
router.post("/addPatientAllergy", addPatientAllergy);
router.post("/addPatientInsurance", addPatientInsurance);
router.post("/addPatientMedication", addPatientMedication);
router.get("/getPatientTimings", getPatientTimings);
router.put("/update-vitals/:patientId", addPatientVitals);
router.get("/:patientId/summary", fetchDataByPatientId);
router.get("/:patientId/summary/ccm", fetchDataByPatientIdForccm);
router.get("/searchPatient",searchPatient)
router.get("/getAllTasks", getAllTasks);
module.exports = router