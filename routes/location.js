const express = require('express');
const router = express.Router();

// Import controller functions
const {
  createProviderLocation,
  getLocationsByProviderId,
  updateProviderLocation,
  deleteProviderLocation,
} = require('../controllers/locationCtrl'); // adjust the path if needed

//  Create a new location
router.post('/create', createProviderLocation);


//  Get locations by provider ID
router.get('/provider/:provider_id', getLocationsByProviderId);

//  Update a location
router.put('/update', updateProviderLocation); // send location_id in body

//  Delete a location by location_id
router.delete('/delete/:location_id', deleteProviderLocation);

module.exports = router;
