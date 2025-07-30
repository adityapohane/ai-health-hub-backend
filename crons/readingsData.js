const axios = require('axios');
const BASE_URL = process.env.DEVICE_API_URL;
const API_KEY = process.env.MIOLABS_API_KEY;
const headers = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "x-api-key": API_KEY,
};

const deviceId = "200240801039";
const startTime = "2025-07-28T00:00:00.000Z";
const endTime = "2025-07-28T23:59:59.000Z";

async function getReadings() {
try {
    let url = `${BASE_URL}/v1/devices/${deviceId}/telemetry`;

    // If any time params exist, add them to URL
    if (startTime || endTime) {
      const queryParams = new URLSearchParams();
      if (startTime) queryParams.append("startTime", startTime);
      if (endTime) queryParams.append("endTime", endTime);
      url += `?${queryParams.toString()}`;
    }

    const response = await axios.get(url, { headers });

    console.log(response.data);
} catch (error) {
    console.error("Error fetching telemetry data:", error);
}
}
getReadings();