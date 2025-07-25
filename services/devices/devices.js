require("dotenv").config();
const connection = require("../../config/db");
const moment = require("moment");
const logAudit = require("../../utils/logAudit");
const axios = require("axios");

const getDevices = async (req, res) => {
    try {
        const {imei} = req.query;
        let sql = `SELECT * FROM devices WHERE device_assigned = 0`;
        if (imei) {
            sql += ` AND imei LIKE '%${imei}%'`;
        }
        sql += ` LIMIT 5`;
        const [rows] = await connection.query(sql);
        return res.status(200).json({
            success: true,
            message: "Devices fetched successfully",
            data: rows,
        });
    } catch (error) {
        console.error("Error fetching devices:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching devices",
        });
    }
};

const assignDevice = async (req, res) => {
    try {
        const {imei,patientId} = {...req.body,...req.user,...req.params,...req.query};
        const deviceQ = `SELECT * FROM devices where imei = ?`;
        const [deviceRows] = await connection.query(deviceQ, [imei]);
        if(deviceRows.length === 0){
            return res.status(200).json({
                success: true,
                message: "Device not found",
                data: deviceRows,
            });
        }
        const deviceAssignedQ = `SELECT * FROM devices where imei = ? AND device_assigned = 1`;
        const [deviceAssignedRows] = await connection.query(deviceAssignedQ, [imei]);
       if(deviceAssignedRows.length > 0){
        return res.status(200).json({
            success: true,
            message: "Device already assigned",
        });
       }

       const sql2 = `UPDATE devices set device_assigned = 1 where imei = ?`;
       await connection.query(sql2, [imei]);
       const devId = deviceRows.length ? deviceRows[0].id : 0
       const sql3 = `INSERT INTO device_assign (device_table_id, patient_id, fk_assign_user_id,imei,assigned_date) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
       const [devAssignedRows] = await connection.query(sql3, [devId, patientId, req.user.user_id, imei]);
       const insertedId = devAssignedRows.insertId;
       await logAudit(req, 'CREATE', 'DEVICE_ASSIGN', devId, `Device assigned with deviceTableId: ${devId} - ${imei}`);
       return res.status(200).json({
           success: true,
           message: "Device assigned successfully",
           insertedId
       });
    } catch (error) {
        console.error("Error assigning device:", error);
        res.status(500).json({
            success: false,
            message: "Error assigning device",
        });
    }
};

const getPatientDevices = async (req, res) => {
    try {
        const {patientId} = {...req.body,...req.user,...req.params,...req.query};
        if(!patientId){
            return res.status(200).json({
                success: true,
                message: "PatientId is required",
            });
        }
        const sql = `SELECT da.*, d.device_id,d.status,d.created,d.iccid,d.model_number,d.firmware_version FROM device_assign da left join devices d on d.id = da.device_table_id where patient_id = ?`;
        const [rows] = await connection.query(sql, [patientId]);
        return res.status(200).json({
            success: true,
            message: "Devices fetched successfully",
            data: rows,
        });
    } catch (error) {
        console.error("Error fetching devices:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching devices",
        });
    }
};
const getMonthRange = (dateStr) => {
    const inputDate = dateStr ? new Date(dateStr) : new Date();
  
    if (isNaN(inputDate.getTime())) {
      throw new Error("Invalid date format. Expected 'YYYY-MM-DD'.");
    }
  
    // Start of month: YYYY-MM-01T00:00:00
    const startTime = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1, 0, 0, 0).getTime();
  
    // End of month: last day of month at 23:59:59
    const endTime = new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 0, 23, 59, 59).getTime();
  
    return { startTime, endTime };
  }
const listTelemetryWithRange  = async (req, res) => {
    const { patientId,date } = {...req.params,...req.query};
const { startTime, endTime } = getMonthRange(date);
console.log(startTime,endTime,date)
    try {
        if(!patientId){
            return res.status(200).json({
                success: true,
                message: "PatientId is required",
            });
        }
        let deviceQ = `SELECT da.device_table_id, d.device_id,d.status,d.created,d.iccid,d.model_number,d.imei,d.firmware_version FROM device_assign da left join devices d on d.id = da.device_table_id where patient_id = ?`;
        const [deviceRows] = await connection.query(deviceQ, [patientId]);
        if(deviceRows.length === 0){
            return res.status(200).json({
                success: true,
                message: "Device not found",
            });
        }
        for(const device of deviceRows){
            let deviceId = device.device_id
            const BASE_URL = process.env.DEVICE_API_URL;
            const API_KEY = process.env.MIOLABS_API_KEY;
            
            const headers = {
         "Content-Type": "application/json",
         "Accept": "application/json",
         "x-api-key": API_KEY,
       };
       
      let url = `${BASE_URL}/v1/devices/${deviceId}/telemetry`;
  
      // If any time params exist, add them to URL
      if (startTime || endTime) {
        const queryParams = new URLSearchParams();
        if(startTime) queryParams.append("startTime", startTime);
        if(endTime) queryParams.append("endTime", endTime);

        const urlWithParams = `${url}?${queryParams.toString()}`;
        const response = await axios.get(urlWithParams, { headers });
        device["telemetry"] = response.data;
      }
    }
      res.status(200).json({ success: true, data: deviceRows });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching telemetry data",
        error: error    ,
      });
    }
  };
  const listTelemetryWithRange2 = async (req, res) => {
    const { patientId } = req.params;
    const { startTime, endTime } = req.query;
  
    try {
      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: "PatientId is required",
        });
      }
  
      // Fetch devices assigned to patient
      const deviceQuery = `
        SELECT da.device_table_id, d.device_id, d.status, d.created, d.iccid, d.model_number, d.imei, d.firmware_version
        FROM device_assign da
        LEFT JOIN devices d ON d.id = da.device_table_id
        WHERE da.patient_id = ?
      `;
      const [deviceRows] = await connection.query(deviceQuery, [patientId]);
  
      if (deviceRows.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No devices found for this patient",
          data: [],
        });
      }
  
      const BASE_URL = process.env.DEVICE_API_URL;
      const API_KEY = process.env.MIOLABS_API_KEY;
      const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-key": API_KEY,
      };
  
      // Fetch telemetry for each device
      let i = 0;
      let resObj ={}; 
      for (const device of deviceRows) {
        i++;
        const deviceId = device.device_id;
        let url = `${BASE_URL}/v1/devices/${deviceId}/telemetry`;
  
        if (startTime || endTime) {
          const queryParams = new URLSearchParams();
          if (startTime) queryParams.append("startTime", startTime);
          if (endTime) queryParams.append("endTime", endTime);
          url += `?${queryParams.toString()}`;
        }
  
        try {
          const response = await axios.get(url, { headers });
          resObj[`item${i}`] = response.data.items;
        } catch (telemetryError) {
          // Optionally handle telemetry error per device
          device.data = null;
          device.telemetryError = telemetryError.message;
        }
      }
  
      res.status(200).json({
        data: {
          success: true,
          data: resObj,
          
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching telemetry data",
        error: error.message,
      });
    }
  };

module.exports = {
    getDevices,
    assignDevice,
    getPatientDevices,
    listTelemetryWithRange2
}