const axios = require("axios");
require("dotenv").config();

const BASE_URL = process.env.MIO_BASE_URL;
const API_KEY = process.env.MIO_API_KEY;

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "x-api-key": API_KEY,
};

exports.listDevices = async (req, res) => {
  try {
    console.log(API_KEY)
    const response = await axios.get(`${BASE_URL}/v1/devices`, { headers });
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: "Error listing devices", error: error.message });
  }
};

exports.getDeviceById = async (req, res) => {
  const { deviceId } = req.params;
  try {
    const response = await axios.get(`${BASE_URL}/v1/devices/${deviceId}`, { headers });
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching device details", error: error.message });
  }
};

exports.listTelemetryWithRange  = async (req, res) => {
  const { deviceId } = req.params;
  const { startTime, endTime } = req.query;

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

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching telemetry data",
      error: error.message,
    });
  }
};
