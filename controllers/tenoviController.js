const axios = require("axios");

const patientDeviceMap = new Map();

const api = axios.create({
    baseURL: process.env.TENOVI_BASE_URL,
    headers: {
        Authorization: `Bearer ${process.env.TENOVI_API_KEY}`,
        "Content-Type": "application/json",
    },
});

// 1. Get all devices (optional)
exports.getDevices = async (req, res) => {
    try {
        const response = await api.get("/devices"); // Adjust endpoint if needed
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch devices",
            error: error.message,
        });
    }
};

// 2. Assign device to a patient
exports.assignDevice = async (req, res) => {
    try {
        const { patientId, deviceId } = req.body;

        // Check if device is already assigned to this patient
        if (patientDeviceMap.has(patientId)) {
            return res.status(400).json({
                message: "Device already assigned to this patient",
                existingDeviceId: patientDeviceMap.get(patientId),
            });
        }

        // Assign device via Tenovi API
        const response = await api.post(`/devices/${deviceId}/assign`, {
            external_patient_id: patientId,
        });

        // Save mapping locally (or in DB)
        patientDeviceMap.set(patientId, deviceId);

        res.status(200).json({
            message: "Device assigned successfully",
            tenoviResponse: response.data,
        });
    } catch (error) {
        res.status(500).json({
            message: "Device assignment failed",
            error: error.message,
        });
    }
};

// 3. Get readings for a patient by patientId
exports.getReadingsByPatient = async (req, res) => {
    try {
        const { patientId } = req.params;

        const deviceId = patientDeviceMap.get(patientId);

        if (!deviceId) {
            return res.status(404).json({ message: "No device assigned to this patient" });
        }

        const response = await api.get(`/devices/${deviceId}/readings`);

        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch readings",
            error: error.message,
        });
    }
};
