const dotenv = require('dotenv');
dotenv.config();
const cron = require('node-cron');
const axios = require('axios');
const connection = require('../config/db');


const getAllDevices = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Running device sync...`);

    const response = await axios.get("https://api.connect.mio-labs.com/v1/devices", {
      headers: {
        'x-api-key': process.env.MIOLABS_API_KEY,
      },
    });

    const devices = response.data.items;

    if (!Array.isArray(devices)) {
      throw new Error('Invalid API response. Expected an array.');
    }

    if (devices.length === 0) {
      console.log('No device data received.');
      return;
    }

    const deviceIds = devices.map(d => d.deviceId);

    // Fetch existing devices by deviceId
    const [existingDevices] = await connection.query(
      `SELECT device_id, status FROM devices WHERE device_id IN (?)`,
      [deviceIds]
    );

    const existingMap = {};
    existingDevices.forEach(device => {
      existingMap[device.device_id] = device.status;
    });

    const toInsert = [];
    const toUpdate = [];

    for (const device of devices) {
      const existingStatus = existingMap[device.deviceId];

      if (existingStatus === undefined) {
        // Not in DB — insert new
        toInsert.push([
          device.lastActive,
          device.deviceId,
          device.imei,
          device.status,
          device.iccid,
          device.modelNumber,
          device.firmwareVersion,
          device.createdAt
        ]);
      } else if (existingStatus !== device.status) {
        // Exists but status has changed — update
        toUpdate.push({
          status: device.status,
          last_active: device.lastActive,
          imei: device.imei,
          iccid: device.iccid,
          model_number: device.modelNumber,
          firmware_version: device.firmwareVersion,
          created: device.createdAt,
          device_id: device.deviceId,
        });
      }
      // If status same — do nothing
    }

    // Insert new devices
    if (toInsert.length > 0) {
      const insertQuery = `
        INSERT INTO devices (
          last_active, device_id, imei, status,
          iccid, model_number, firmware_version, created
        ) VALUES ?;
      `;
      await connection.query(insertQuery, [toInsert]);
      console.log(`Inserted ${toInsert.length} new devices`);
    }

    // Update changed status
    for (const d of toUpdate) {
      const updateQuery = `
        UPDATE devices
        SET
          status = ?,
          last_active = ?,
          imei = ?,
          iccid = ?,
          model_number = ?,
          firmware_version = ?,
          created = ?
        WHERE device_id = ?;
      `;
      await connection.query(updateQuery, [
        d.status,
        d.last_active,
        d.imei,
        d.iccid,
        d.model_number,
        d.firmware_version,
        d.created,
        d.device_id
      ]);
    }

    console.log(`Updated ${toUpdate.length} existing devices`);

  } catch (err) {
    console.error('Device sync failed:', err.message);
  }
};

  getAllDevices(); //test
// cron.schedule('*/5 * * * *',getAllDevices);