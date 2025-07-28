const connection = require("../../config/db");
const moment = require("moment");
const logAudit = require("../../utils/logAudit");
const fs = require('fs');
const path = require('path');
const getAllPatients = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 10,
            order = "DESC",
            orderBy = "last_visit",
        } = req.query;
        const {date} = req.body;
        const targetDate = date ? moment(date, moment.ISO_8601, true) : moment();
        const startDate = targetDate.clone().startOf('month').format('YYYY-MM-DD 00:00:00');
        const endDate = targetDate.clone().endOf('month').format('YYYY-MM-DD 23:59:59');
        page = parseInt(page);
        limit = parseInt(limit);
        const offset = (page - 1) * limit;
        const { roleid, user_id } = req?.user;
       

                    const sql = `SELECT 
                        GROUP_CONCAT(DISTINCT cb.id ORDER BY cb.id SEPARATOR ', ') AS billing_ids,
                        cb.patient_id,
                        up.phone,
                        up.dob,
                        '${endDate}' AS date_of_service,
                        GROUP_CONCAT(DISTINCT cc.code ORDER BY cc.code SEPARATOR ', ') AS cpt_codes,
                        GROUP_CONCAT(DISTINCT cb.cpt_code_id ORDER BY cb.cpt_code_id SEPARATOR ', ') AS cpt_code_ids,
                        GROUP_CONCAT(DISTINCT cb.code_units ORDER BY cb.code_units SEPARATOR ', ') AS code_units,
                        u.created AS enrolled_date,
                        CONCAT(up.firstname, " ", up.lastname) AS patient_name,
                        CONCAT(up2.firstname, " ", up2.lastname) AS provider_name,
                        cb.status AS billing_status,
                        um.fk_physician_id,
                        up.service_type
                    FROM cpt_billing cb
                    LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
                    LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
                    LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
                    LEFT JOIN users u ON u.user_id = cb.patient_id
                    LEFT JOIN user_profiles up2 ON up2.fk_userid = um.fk_physician_id
                    WHERE cb.created BETWEEN '${startDate}' AND '${endDate}'
                    AND um.fk_physician_id = ${user_id}
                    GROUP BY cb.patient_id
                    ORDER BY cb.patient_id
            LIMIT ${limit} OFFSET ${offset};`;
        const [patients] = await connection.query(sql);
        const total = patients?.length ? patients.length : 0 ;

        for (const patient of patients) {
          const [rows] = await connection.query(`
            SELECT
              (
                SELECT IFNULL(SUM(duration), 0)
                FROM (
                  SELECT DISTINCT created, duration
                  FROM notes
                  WHERE patient_id = ? AND type LIKE '%rpm%' AND created BETWEEN ? AND ?
                ) AS rpm_notes
              ) +
              (
                SELECT IFNULL(SUM(duration), 0)
                FROM (
                  SELECT DISTINCT created, duration
                  FROM tasks
                  WHERE patient_id = ? AND type LIKE '%rpm%' AND created BETWEEN ? AND ?
                ) AS rpm_tasks
              ) AS rpm_minutes,
          
              (
                SELECT IFNULL(SUM(duration), 0)
                FROM (
                  SELECT DISTINCT created, duration
                  FROM notes
                  WHERE patient_id = ? AND  type LIKE '%ccm%' AND created BETWEEN ? AND ?
                ) AS ccm_notes
              ) +
              (
                SELECT IFNULL(SUM(duration), 0)
                FROM (
                  SELECT DISTINCT created, duration
                  FROM tasks
                  WHERE patient_id = ? AND  type LIKE '%ccm%' AND created BETWEEN ? AND ?
                ) AS ccm_tasks
              ) AS ccm_minutes,
          
              (
                SELECT IFNULL(SUM(duration), 0)
                FROM (
                  SELECT DISTINCT created, duration
                  FROM notes
                  WHERE patient_id = ? AND  type LIKE '%pcm%' AND created BETWEEN ? AND ?
                ) AS pcm_notes
              ) +
              (
                SELECT IFNULL(SUM(duration), 0)
                FROM (
                  SELECT DISTINCT created, duration
                  FROM tasks
                  WHERE patient_id = ? AND type LIKE '%pcm%' AND created BETWEEN ? AND ?
                ) AS pcm_tasks
              ) AS pcm_minutes
          `, [
            patient.patient_id, startDate, endDate, patient.patient_id, startDate, endDate,  // RPM
            patient.patient_id, startDate, endDate, patient.patient_id, startDate, endDate,  // CCM
            patient.patient_id, startDate, endDate, patient.patient_id, startDate, endDate   // PCM
          ]);
        patient.total_minutes = rows[0]?.rpm_minutes+rows[0]?.ccm_minutes+rows[0]?.pcm_minutes;
        patient.rpm_minutes = rows[0]?.rpm_minutes;
        patient.ccm_minutes = rows[0]?.ccm_minutes;
        patient.pcm_minutes = rows[0]?.pcm_minutes;
        const idsArray = String(patient.billing_ids).split(',').map(id => id.trim());
        const sql2 = `SELECT cpt_code_id,cc.code,code_units,created,cc.price from cpt_billing LEFT JOIN cpt_codes cc ON cc.id = cpt_code_id WHERE cpt_billing.id IN (${idsArray.join(",")})`
        const [data] = await connection.query(sql2);
        patient.cpt_data = data;
     let total = data.reduce((sum, item) => {
  const price = parseFloat(item.price);
  const units = item.code_units && item.code_units > 0 ? item.code_units : 1;
  // console.log(sum+units*price,price,units)
  return sum + (price * units);
}, 0);
      total = parseFloat(total.toFixed(2));
      patient.totalPrice = total;

      // notes for reviewing
      const [notes] = await connection.query(
      `SELECT note, created,duration,type, created_by, note_id
       FROM notes
       WHERE patient_id = ?
         AND created BETWEEN ? AND ?`,
      [patient.patient_id, startDate, endDate]
    );
    patient.notes = notes
        }
        return res.status(200).json({
            success: true,
            message: "Patients fetched successfully",
            data: patients,
            pagination: {
                total: total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching patients:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching patients",
        });
    }
};

const updateBillingStatus = async (req, res) => {
    try {
      const { billing_ids, status } = req.body;
  
      if (!billing_ids || typeof billing_ids !== 'string') {
        return res.status(400).json({ error: 'billing_ids must be a comma-separated string' });
      }
  
      const idsArray = billing_ids
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(Boolean);
  
      if (idsArray.length === 0) {
        return res.status(400).json({ error: 'No valid billing IDs provided.' });
      }
  
      const placeholders = idsArray.map(() => '?').join(', ');
      let sql = `UPDATE cpt_billing SET status = ?`;
      const values = [status];

      if (status == 2) {
        sql += `, billed_date = ?`;
        values.push(new Date()); // current timestamp
        }

      sql += ` WHERE id IN (${placeholders})`;
      values.push(...idsArray);
  
      await connection.execute(sql, values);
      
      await logAudit(req, 'UPDATE', 'BILLING', 0, `Billing status updated to ${status} for IDs: ${billing_ids}`);
  
      return res.status(200).json({
        message: 'Billing status updated successfully',
        updated_ids: idsArray,
        new_status: status || 0
      });
    } catch (err) {
      console.error('Error updating billing statuses:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
};
const getFormInformationForCms = async (req, res) => {
  try {
      const {billing_ids,patientId,date} = {...req.body,...req.user,...req.params};
      const {user_id} = req.user;
      const targetDate = date ? moment(date, moment.ISO_8601, true) : moment();
      const startDate = targetDate.clone().startOf('month').format('YYYY-MM-DD 00:00:00');
      const endDate = targetDate.clone().endOf('month').format('YYYY-MM-DD 23:59:59');
      if(!patientId && !billing_ids){
        return res.status(400).json({ error: 'patientId and billing_ids is required' });
      }
     

                  const sql = `SELECT 
                      GROUP_CONCAT(DISTINCT cb.id ORDER BY cb.id SEPARATOR ', ') AS billing_ids,
                      cb.patient_id,
                      up.*,
                      '${endDate}' AS date_of_service,
                      GROUP_CONCAT(DISTINCT cc.code ORDER BY cc.code SEPARATOR ', ') AS cpt_codes,
                      GROUP_CONCAT(DISTINCT cb.cpt_code_id ORDER BY cb.cpt_code_id SEPARATOR ', ') AS cpt_code_ids,
                      GROUP_CONCAT(DISTINCT cb.code_units ORDER BY cb.code_units SEPARATOR ', ') AS code_units,
                      u.created AS enrolled_date,
                      CONCAT(up.firstname, " ", up.lastname) AS patient_name,
                      CONCAT(up2.firstname, " ", up2.lastname) AS provider_name,
                      up2.firstname as provider_firstname,
                      up2.lastname as provider_lastname,
                      up2.middlename as provider_middlename,
                      up2.phone as provider_phone,
                      up2.fax as provider_fax,
                      up2.work_email as provider_email,
                      up2.npi as provider_npi,
                      up2.taxonomy as provider_taxonomy,
                      up2.state as provider_state,
                      up2.city as provider_city,
                      up2.zip as provider_zip,
                      up2.address_line as provider_address_line1,
                      up2.address_line_2 as provider_address_line2
                  FROM cpt_billing cb
                  LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
                  LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
                  LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
                  LEFT JOIN users u ON u.user_id = cb.patient_id
                  LEFT JOIN user_profiles up2 ON up2.fk_userid = um.fk_physician_id
                  WHERE cb.created BETWEEN '${startDate}' AND '${endDate}'
                  AND um.fk_physician_id = ${user_id} AND cb.patient_id = ${patientId}
                  GROUP BY cb.patient_id
                  ORDER BY cb.patient_id`;
      const [patients] = await connection.query(sql);
      let patient = patients.length > 0 ? patients[0] : null;

      if(patient){
        const inssql = `SELECT * FROM patient_insurances WHERE fk_userid = ${patientId} AND insurance_type = "primary"`;
        const [primaryInsurance] = await connection.query(inssql);
        const diagnosisSql = `SELECT GROUP_CONCAT(icd10) AS diagnosis_codes FROM patient_diagnoses WHERE patient_id = ${patientId};`;
        const [diagnosis] = await connection.query(diagnosisSql);
        patient.insurance = primaryInsurance;
        patient.diagnosis = diagnosis;
      const idsArray = String(patient.billing_ids).split(',').map(id => id.trim());
      const sql2 = `SELECT cpt_code_id,cc.code,code_units,created,cc.price from cpt_billing LEFT JOIN cpt_codes cc ON cc.id = cpt_code_id WHERE cpt_billing.id IN (${idsArray.join(",")})`
      const [data] = await connection.query(sql2);
      patient.cpt_data = data;
   let total = data.reduce((sum, item) => {
const price = parseFloat(item.price);
const units = item.code_units && item.code_units > 0 ? item.code_units : 1;
return sum + (price * units);
}, 0);

    total = parseFloat(total.toFixed(2));
    patient.totalPrice = total;
  }
  let diagnosisCodes = patient.diagnosis[0].diagnosis_codes;
  let diagnosisObj = {};
  if(diagnosisCodes){
    diagnosisCodes = diagnosisCodes.split(",");
    if(diagnosisCodes.length){
      diagnosisCodes.forEach((code, index) => {
        diagnosisObj[`diag_${index+1}`] = code;
      });
    }
  }
  patient = {...patient,...diagnosisObj};
  let insObj={};
  if(patient.insurance){
    const ins = patient.insurance[0];
    
    if(ins["patient_relationship"] == "0"){
      insObj["ins"] = "Self";
      insObj.ins_addr_1 = patient.address_line || "";
      insObj.ins_city = patient.city || "";
      insObj.ins_state = patient.state || "";
      insObj.ins_zip = patient.zip || "";
      insObj.ins_name_f = patient.firstname || "";
      insObj.ins_name_l = patient.lastname || "";
      insObj.ins_dob = patient.dob;
      insObj.ins_sex = patient.gender;
      insObj.ins_number = ins.insurance_policy_number;
      insObj.ins_group = ins.insurance_group_number;
      insObj.pat_rel = ins.patient_relationship;
    }else{
      insObj.ins_addr_1 = ins.address_line || "";
      insObj.ins_city = ins.city || "";
      insObj.ins_state = ins.state || "";
      insObj.ins_zip = ins.zip || "";
      insObj.ins_name_f = ins.insured_name?.split(" ")[0] || "";
      insObj.ins_name_l = ins.insured_name?.split(" ")[1] || "";
      insObj.ins_dob = ins.insured_dob || "";
      insObj.ins_sex = ins.insured_gender || "";
      insObj.ins_number = ins.insurance_policy_number || "";
      insObj.ins_group = ins.insurance_group_number || "";
      insObj.pat_rel = ins.patient_relationship;
    }
  }
  const timestamp = Date.now().toString();
  const rand = () => Math.floor(1000 + Math.random() * 9000); // 4-digit suffix

  const fileid = `${timestamp}`;
  const remote_fileid = `file_${timestamp}_${rand()}`;
  const remote_batchid = `batch_${timestamp}_${rand()}`;
  const remote_claimid = patient.claimId || `claim_${timestamp}_${rand()}`;
  const remote_chgid = `chg_${timestamp}_${rand()}`;
  let charge = [];
  for (const c of patient.cpt_data){
    // console.log(c);
    charge.push({
      charge: c.price,
      charge_record_type: patient.chargeRecordType || "UN",
      diag_ref: patient.diagRef || "",
      from_date: patient.created?.moment().format("YYYY-MM-DD"),
      thru_date: patient.created?.moment().format("YYYY-MM-DD"),
      place_of_service: patient.placeOfService || "",
      proc_code: c.code,
      units: c.code_units
    })
  }
  // console.log(patient);
  const claimData = {
    fileid: fileid || "",
    claim: [
      {
        accept_assign: patient.acceptAssign || "Y",
        auto_accident: patient.autoAccident || "N",
        balance_due: (patient.totalPrice?.toFixed(2) || "0.00"),

        bill_addr_1: patient.billAddress || "",
        bill_city: patient.billCity || "",
        bill_name: patient.billName || "",
        bill_npi: patient.billNpi || "",
        bill_phone: patient.billPhone || "",
        bill_state: patient.billState || "",
        bill_taxid: patient.billTaxId || "",
        bill_taxid_type: patient.billTaxIdType || "",
        bill_zip: patient.billZip || "",

        charge: charge || "",

        claim_form: patient.claimForm || "1500",

        diag_1: patient.diag_1 || "",
        diag_2: patient.diag_2 || "",
        diag_3: patient.diag_3 || "",
        diag_4: patient.diag_4 || "",
        clia_number: patient.cliaNumber || "",
        employment_related: "N",

        // ins obj
        ...insObj,

        pat_addr_1: `${patient.address_line || ""} ${patient.address_line_2 || ""}`.trim(),
        pat_city: patient.city || "",
        pat_dob: patient.dob ? moment(patient.dob).format("YYYY-MM-DD") : "",
        pat_name_f: patient.firstname || "",
        pat_name_l: patient.lastname || "",
        pat_sex: patient.gender || "",
        pat_state: patient.state || "",
        pat_zip: patient.zip || "",

        payerid: patient.payerId || "",
        pcn: patient.pcn || "",

        payer_name: patient.payerName || "",
        payer_order: patient.payerOrder || "",
        payer_addr_1: patient.payerAddress || "",
        payer_city: patient.payerCity || "",
        payer_state: patient.payerState || "",
        payer_zip: patient.payerZip || "",

        prov_name_f: patient.provider_firstname || "",
        prov_name_l: patient.provider_lastname || "",
        prov_name_m: patient.provider_middlename || "",
        prov_npi: patient.provider_npi || "",
        prov_taxonomy: patient.provider_taxonomy || "",

        ref_name_f: patient.refFirstName || "",
        ref_name_l: patient.refLastName || "",
        ref_name_m: patient.refMiddleName || "",
        ref_npi: patient.refNPI || "",

        remote_fileid: remote_fileid || "",
        remote_batchid: remote_batchid || "",
        remote_claimid: remote_claimid || "",
        total_charge: (patient.totalPrice?.toFixed(2) || "0.00")
      }
    ]
  };
      const data = generateClaimJSONFile(claimData,remote_claimid);
      // console.log(data);
      return res.status(200).json({
          success: true,
          message: "Patients fetched successfully",
          data: claimData,
      });
  } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({
          success: false,
          message: "Error fetching patients",
      });
  }
};
const sendForClaim = async (req, res) => {
    const {claimData} = req.body;
    const form = new FormData();
    const { fileid } = claimData;
    let ACCOUNT_KEY = process.env.MD_ACCOUNT_KEY;
    form.append('AccountKey', ACCOUNT_KEY);
    form.append('File', fs.createReadStream(`${__dirname}/claims/claim_${fileid}.json`));
    form.append('Filename', `claim_${fileid}.json`);
  
    const resp = await fetch('https://svc.claim.md/services/upload/', {
      method: 'POST',
      headers: {
        Accept: 'application/json', // 👈 This controls the response format
        ...form.getHeaders()
      },
      body: form
    });
  
    const data = await resp.json(); // JSON response
    console.log(data);
    return res.status(200).json({
        success: true,
        message: "Patients fetched successfully",
        data: data,
    });
};
const patientEligibility = async (req, res) => {
    const {patientId} = req.body;
    const sql = `SELECT * FROM patient_eligibility WHERE patient_id = ${patientId}`;
    const [data] = await connection.query(sql);
    return res.status(200).json({
        success: true,
        message: "Patients fetched successfully",
        data: data,
    });
};
module.exports = {
    getAllPatients,
    updateBillingStatus,
    getFormInformationForCms,
    sendForClaim
}


/**
 * Generates a claim JSON file using a dynamic patient object.
 * @param {Object} patient - Object containing patient, insurance, and billing info.
 */
function generateClaimJSONFile(claimData,remote_claimid) {
  // 🆔 Unique ID generators (using timestamp + random suffix for uniqueness)
 

  const fileName = `${remote_claimid}.json`;
  
  // Path to "claim" folder inside the same directory
  const dirPath = path.join(__dirname, 'claims');
  
  // Create "claim" folder if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Full file path inside the "claim" folder
  const filePath = path.join(dirPath, fileName);

  try {
    fs.writeFileSync(filePath, JSON.stringify(claimData, null, 2), 'utf8');
    console.log(`✅ File created: ${filePath}`);
    return {filePath,fileName};
  } catch (err) {
    console.error('❌ Failed to write file:', err);
    return {error: err};
  }
}