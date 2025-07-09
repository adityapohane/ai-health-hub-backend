const dotenv = require('dotenv');
dotenv.config();
const cron = require('node-cron');
const axios = require('axios');
const connection = require('../config/db');


const getAllDevices =     async () => {

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
  
      // Insert or Update Devices
      const query = `
        INSERT INTO devices (
          last_active, device_id, imei, status,
          iccid, model_number, firmware_version,created
        ) VALUES ?
        ON DUPLICATE KEY UPDATE
          last_active = VALUES(last_active),
          imei = VALUES(imei),
          status = VALUES(status),
          iccid = VALUES(iccid),
          model_number = VALUES(model_number),
          firmware_version = VALUES(firmware_version),
          created = VALUES(created);
      `;
  
      const values = devices.map(device => [
        device.lastActive,
        device.deviceId,
        device.imei,
        device.status,
        device.iccid,
        device.modelNumber,
        device.firmwareVersion,
        device.createdAt
      ]);
  
      if (values.length > 0) {
        connection.query(query, [values], (err, result) => {
          if (err) {
            console.error('MySQL Error:', err);
          } else {
            console.log(`Inserted/Updated ${result.affectedRows} rows`);
          }
        });
      } else {
        console.log('No device data received.');
      }
  
    } catch (err) {
      console.error('Cron job failed:', err.message);
    }
  }

  // getAllDevices(); //test
cron.schedule('*/5 * * * *',getAllDevices);