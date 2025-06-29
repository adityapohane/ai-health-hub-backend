const connection = require("../config/db");

exports.createOrGetRingCentConfig = async (req, res) => {
  const {
    client_id,
    client_server,
    client_secret,
    phone_number,
    jwt_token,
    ring_cent_pass,
    auth_type,
    provider_id
  } = req.body;

  if (!provider_id) {
    return res.status(400).json({ error: 'provider_id is required' });
  }

  try {
    const [existing] = await connection.query(
      'SELECT * FROM ring_cent_config WHERE provider_id = ?',
      [provider_id]
    );

    if (existing.length > 0) {
      // ✅ Update existing config
      await connection.query(
        `UPDATE ring_cent_config 
         SET client_id = ?, client_server = ?, client_secret = ?, phone_number = ?, 
             jwt_token = ?, ring_cent_pass = ?, auth_type = ?
         WHERE provider_id = ?`,
        [
          client_id,
          client_server,
          client_secret,
          phone_number,
          jwt_token,
          ring_cent_pass,
          auth_type,
          provider_id
        ]
      );

      const [updatedConfig] = await connection.query(
        'SELECT * FROM ring_cent_config WHERE provider_id = ?',
        [provider_id]
      );

      return res.status(200).json({ message: 'Config updated', data: updatedConfig[0] });
    }

    // ✅ Insert new config
    const [result] = await connection.query(
      `INSERT INTO ring_cent_config 
       (client_id, client_server, client_secret, phone_number, jwt_token, ring_cent_pass, auth_type, provider_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client_id,
        client_server,
        client_secret,
        phone_number,
        jwt_token,
        ring_cent_pass,
        auth_type,
        provider_id
      ]
    );

    const [newConfig] = await connection.query(
      'SELECT * FROM ring_cent_config WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({ message: 'Config created', data: newConfig[0] });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};


exports.getRingCentConfigByProviderId = async (req, res) => {
  const { provider_id } = req.params;

  if (!provider_id) {
    return res.status(400).json({ error: 'provider_id is required' });
  }

  try {
    const [result] = await connection.query(
      'SELECT * FROM ring_cent_config WHERE provider_id = ?',
      [provider_id]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: 'No config found for this provider_id' });
    }

    return res.status(200).json({ data: result[0] });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
