const express = require('express');
const router = express.Router();
const taskController = require('../controllers/ai-task-ctrl');

router.get('/getTaskAnalytics', taskController.getTaskAnalytics);
router.get('/getTaskRecommendations', taskController.getTaskRecommendations);
router.post('/generateAutomatedTasks', taskController.generateAutomatedTasks);

router.post('/startTaskTimer', taskController.startTaskTimer);
router.post('/stopTaskTimer', taskController.stopTaskTimer);
router.get('/getTaskTimeEntries', taskController.getTaskTimeEntries);

router.post('/createWorkflowTemplate', taskController.createWorkflowTemplate);
router.post('/applyWorkflow', taskController.applyWorkflow);
router.get('/getWorkflowTemplates', taskController.getWorkflowTemplates);

router.get('/getComplianceReport', taskController.getComplianceReport);
router.get('/getQualityMetrics', taskController.getQualityMetrics);

// Get all tasks
router.get('/getAllTasks', taskController.getAllPatientTasks);

// Create a new task
router.post('/addTask', taskController.addTask);

// Update an existing task
router.put('/updateTask/:id', taskController.updateTask);

// Delete a task
router.delete('/deleteTask/:id', taskController.deleteTask);

module.exports = router;
