const pool = require('../../config/db');  

// Controller to create a new provider location
const createProviderLocation = async (req, res) => {
  try {
    const {
      provider_id,
      location_name,
      location_address_line1,
      location_address_line2 = null,
      location_state,
      location_country,
      location_phone,
      location_zip_code = null,
    } = req.body;

    // Validation (basic)
    if (!provider_id || !location_name || !location_address_line1 || !location_state || !location_country || !location_phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO providerlocations (
        provider_id, location_name, location_address_line1, location_address_line2,
        location_state, location_country, location_phone, location_zip_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        provider_id,
        location_name,
        location_address_line1,
        location_address_line2,
        location_state,
        location_country,
        location_phone,
        location_zip_code
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: {
        location_id: result.insertId,
        provider_id,
        location_name,
        location_address_line1,
        location_address_line2,
        location_state,
        location_country,
        location_phone,
        location_zip_code,
      }
    });
  } catch (error) {
    console.error('Error creating location:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create location',
    });
  }
};

const getLocationsByProviderId = async (req, res) => {
  try {
    const { provider_id } = req.params;

    if (!provider_id) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID is required',
      });
    }

    const [locations] = await pool.execute(
      `SELECT * FROM providerlocations WHERE provider_id = ?`,
      [provider_id]
    );

    return res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error('Error fetching locations by provider ID:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch locations',
    });
  }
};

const deleteProviderLocation = async (req, res) => {
  try {
    const { location_id } = req.params;

    if (!location_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing location ID',
      });
    }

    const [result] = await pool.execute(`DELETE FROM providerlocations WHERE location_id = ?`, [location_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Location deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting location:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete location',
    });
  }
};
const updateProviderLocation = async (req, res) => {
  try {
    const {
      location_id,
      provider_id,
      location_name,
      location_address_line1,
      location_address_line2 = null,
      location_state,
      location_country,
      location_phone,
      location_zip_code = null,
    } = req.body;

    if (!location_id || !provider_id || !location_name || !location_address_line1 || !location_state || !location_country || !location_phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const [result] = await pool.execute(
      `UPDATE providerlocations SET
        provider_id = ?, location_name = ?, location_address_line1 = ?, location_address_line2 = ?,
        location_state = ?, location_country = ?, location_phone = ?, location_zip_code = ?
      WHERE location_id = ?`,
      [
        provider_id,
        location_name,
        location_address_line1,
        location_address_line2,
        location_state,
        location_country,
        location_phone,
        location_zip_code,
        location_id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
    });
  } catch (error) {
    console.error('Error updating location:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update location',
    });
  }
};


module.exports = {
  createProviderLocation,
  getLocationsByProviderId,
  deleteProviderLocation,
  updateProviderLocation
};
