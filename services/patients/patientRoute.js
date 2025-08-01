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
      addPatientVitals, fetchDataByPatientId, fetchDataByPatientIdForccm,searchPatient,getAllTasks,getAllBeds,unassignBedFromPatient,assignBedToPatient,getAllConsents} = require("./patientCtrl");

const { sendConsentEmail } = require("./patientCtrl2");


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
router.get("/sendConsentEmail", sendConsentEmail);

//beds
router.get("/getAllBeds", getAllBeds);
router.post("/assignBedToPatient", assignBedToPatient);
router.post("/unassignBedFromPatient", unassignBedFromPatient);

//consents
router.get("/getAllConsents", getAllConsents);
module.exports = router