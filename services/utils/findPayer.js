require("dotenv").config();
const axios = require('axios');
/**
 * @param {Object} data
 * @param {string} data.ins_name_l
 * @param {string} data.ins_name_f
 * @param {string} data.pat_rel 18-self G8-Dependent
 * @param {Object} data.fdos yyyymmdd
 * @param {string} data.prov_npi
 * @param {string} data.prov_taxid
 * @param {string[]} data.payerid
 * @param {string} data.ins_number
 */
async function checkPatientEligibility(data) {
  const payload = {
    AccountKey  : process.env.CLAIMMD_ACCOUNT_KEY, // Use actual payer ID in production
    ins_name_l: data.ins_name_l,
    ins_name_f: data.ins_name_f,
    pat_rel: data.pat_rel,
    fdos: data.fdos,
    prov_npi: data.prov_npi,
    prov_taxid: data.prov_taxid,
    payerid: data.payerid,
    ins_number: data.ins_number
  };

  try {
    const response = await axios.post('https://api.claim.md/eligibility', payload, {
      headers: {
        'Authorization': `Bearer ${process.env.CLAIMMD_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("Eligibility Response:", response.data);
    return response.data;

  } catch (err) {
    console.error("Eligibility Check Failed:", err.response?.data || err.message);
    throw err;
  }
}
/**
 * @param {string} payer_name
 */
async function getPayerList(payer_name) {
  const requestData = {
    AccountKey: process.env.CLAIMMD_ACCOUNT_KEY,
    payer_name: payer_name
  };
  const body =  new URLSearchParams(formData).toString()
  try {
    const resp = await axios.post(
      'https://svc.claim.md/services/payerlist/',
     body,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );

    const data = resp.data;
    console.log(data);
    return data;
  } catch (error) {
    console.error('Error fetching payer list:', error.response?.data || error.message);
    throw error;
  }
}
module.exports = { checkPatientEligibility, getPayerList };