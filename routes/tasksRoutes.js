const express = require('express');
const router = express.Router();
const taskController = require('../controllers/ai-task-ctrl');

router.get('/patient/getTaskAnalytics', taskController.getTaskAnalytics);
router.get('/patient/getTaskRecommendations', taskController.getTaskRecommendations);
router.post('/patient/generateAutomatedTasks', taskController.generateAutomatedTasks);

router.post('/patient/startTaskTimer', taskController.startTaskTimer);
router.post('/patient/stopTaskTimer', taskController.stopTaskTimer);
router.get('/patient/getTaskTimeEntries', taskController.getTaskTimeEntries);

router.post('/patient/createWorkflowTemplate', taskController.createWorkflowTemplate);
router.post('/patient/applyWorkflow', taskController.applyWorkflow);
router.get('/patient/getWorkflowTemplates', taskController.getWorkflowTemplates);

router.get('/patient/getComplianceReport', taskController.getComplianceReport);
router.get('/patient/getQualityMetrics', taskController.getQualityMetrics);

// Get all tasks for a patient
router.get('/patient/getAllPatientTasks', taskController.getAllPatientTasks);

// Create a new task
router.post('/patient/addTask', taskController.addTask);

// Update an existing task
router.put('/patient/updateTask/:id', taskController.updateTask);

// Delete a task
router.delete('/patient/deleteTask/:id', taskController.deleteTask);

module.exports = router;
