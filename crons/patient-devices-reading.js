const dotenv = require('dotenv');
dotenv.config();
const cron = require('node-cron');
const axios = require('axios');
const connection = require('../config/db');


const getAllDevices = async () => {
    try {
      const startTime = "";
      const endTime = "";
  
      const select = `SELECT da.*, d.device_id FROM device_assign da LEFT JOIN devices d ON d.id = da.device_table_id`;
      const [devices] = await connection.query(select);
  
      for (const d of devices) {
        try {
          const BASE_URL = process.env.DEVICE_API_URL;
          const API_KEY = process.env.MIOLABS_API_KEY;
          const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-api-key": API_KEY,
          };
  
          const deviceId = d.device_id;
          let url = `${BASE_URL}/v1/devices/${deviceId}/telemetry`;
  
          if (startTime || endTime) {
            const queryParams = new URLSearchParams();
            if (startTime) queryParams.append("startTime", startTime);
            if (endTime) queryParams.append("endTime", endTime);
            url += `?${queryParams.toString()}`;
          }
  
          const response = await axios.get(url, { headers });
  
          const query = `
            INSERT INTO device_data 
            (device_id, data, reading_date)
            VALUES (?, ?, FROM_UNIXTIME(?))
          `;
  
          const obj = response.data;
          const items = obj.items;
         for(const item of items){
            let data = JSON.stringify(item);
            let createdAt = item?.createdAt;
            let ts = item?.deviceData?.ts;
            const values = [
                item?.deviceId,
                data,
                createdAt ? Math.floor(createdAt / 1000) : ts
              ];        
              console.log(values);     
                  await connection.query(query, values);
                  console.log(`Inserted device data for IMEI: ${item?.deviceId}`);

         }
        } catch (innerErr) {
          console.error(`Error processing device ID ${d.device_id}:`, innerErr.message);
          continue; // Don't break loop
        }
      }
    } catch (outerErr) {
      console.error("Fatal error in getAllDevices():", outerErr.message);
    }
  };
  
  getAllDevices(); //test
// cron.schedule('*/5 * * * *',getAllDevices);