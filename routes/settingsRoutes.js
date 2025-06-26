const express = require('express');
const router = express.Router();
const settingsCtrl = require('../controllers/settingsCtrl');

// Remote Patient Monitoring
router.post('/rpm/enable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.rpmService.enable(userId);
    res.status(200).json({
      success: true,
      message: 'RPM enabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/rpm/disable', async (req, res) => {
  try {
    const userId = req.headers['userid']
    const user = await settingsCtrl.rpmService.disable(userId);
    res.status(200).json({
      success: true,
      message: 'RPM disabled successfully',
      data: user.modules
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Patient Overview
router.post('/patient-overview/enable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.patientOverviewService.enable(userId);
    res.status(200).json({
      success: true,
      message: 'Patient Overview enabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/patient-overview/disable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.patientOverviewService.disable(userId);
    res.status(200).json({
      success: true,
      message: 'Patient Overview disabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// AI Care Plans
router.post('/ai-care-plans/enable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.aiCarePlansService.enable(userId);
    res.status(200).json({
      success: true,
      message: 'AI Care Plans enabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/ai-care-plans/disable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.aiCarePlansService.disable(userId);
    res.status(200).json({
      success: true,
      message: 'AI Care Plans disabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// CCM
router.post('/ccm/enable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.ccmService.enable(userId);
    res.status(200).json({
      success: true,
      message: 'CCM enabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/ccm/disable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.ccmService.disable(userId);
    res.status(200).json({
      success: true,
      message: 'CCM disabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// TCM
router.post('/tcm/enable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.tcmService.enable(userId);
    res.status(200).json({
      success: true,
      message: 'TCM enabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/tcm/disable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.tcmService.disable(userId);
    res.status(200).json({
      success: true,
      message: 'TCM disabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PCM
router.post('/pcm/enable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.pcmService.enable(userId);
    res.status(200).json({
      success: true,
      message: 'PCM enabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/pcm/disable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.pcmService.disable(userId);
    res.status(200).json({
      success: true,
      message: 'PCM disabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// BHI
router.post('/bhi/enable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.bhiService.enable(userId);
    res.status(200).json({
      success: true,
      message: 'BHI enabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/bhi/disable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.bhiService.disable(userId);
    res.status(200).json({
      success: true,
      message: 'BHI disabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// AI Phone System
router.post('/ai-phone-system/enable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.aiPhoneSystemService.enable(userId);
    res.status(200).json({
      success: true,
      message: 'AI Phone System enabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/ai-phone-system/disable', async (req, res) => {
  try {
        const userId = req.headers['userid']
    const user = await settingsCtrl.aiPhoneSystemService.disable(userId);
    res.status(200).json({
      success: true,
      message: 'AI Phone System disabled successfully',
      data: user.modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/get-all-user-modules', async (req, res) => {
    try {
        const userId = req.headers['userid']
        const modules = await settingsCtrl.getAllModules(userId);
        res.status(200).json({
            success: true,
            message: 'User modules fetched successfully',
            data: modules
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
module.exports = router;