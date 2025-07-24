const connection = require("../../config/db");
const moment = require("moment");
const logAudit = require("../../utils/logAudit");

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
const listTelemetryWithRange  = async (req, res) => {
    const { patientId } = req.params;
    const { startTime, endTime } = req.query;
    
    try {
        let deviceId = `100241200303` // change this to assigned devices
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

module.exports = {
    getDevices,
    assignDevice,
    getPatientDevices,
    listTelemetryWithRange
}