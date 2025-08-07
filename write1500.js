const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function autofillCMS1500() {
  const existingPdfBytes = fs.readFileSync('./form-cms1500.pdf');

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  // ✅ Fill known fields
  const fieldValues = {
      "276": "Yes",
      "pt_name": "John Doe",
      "insurance_id": "INS123456",
      "ins_name": "John Doe",
      "insurance_name": "Blue Cross",
      "insurance_address": "456 Main Street",
      "insurance_address2": "",
      "insurance_city_state_zip": "New York, NY 10001",
      "insurance_type": "Group",
      "birth_mm": "07",
      "birth_dd": "15",
      "birth_yy": "1980",
      "sex": "No", //Yes-male No-Not works 
      "pt_street": "456 Main Street",
      "pt_city": "New York",
      "pt_state": "NY",
      "pt_zip": "10001",
      "pt_AreaCode": "212",
      "pt_phone": "555 1234",
      "rel_to_ins": "S",
      "ins_street": "456 Main Street",
      "ins_city": "New York",
      "ins_state": "NY",
      "ins_zip": "10001",
      "ins_phone area": "212",
      "ins_phone": "555 1234",
      "ins_policy": "PLC987654",
      "ins_dob_mm": "05",
      "ins_dob_dd": "10",
      "ins_dob_yy": "1979",
      "ins_sex": "No",
      "ins_benefit_plan": "Yes",
      "ins_plan_name": "Blue Cross",
      "pt_signature": "Signed",
      "pt_date": "08/07/2025",
      "cur_ill_mm": "07",
      "cur_ill_dd": "01",
      "cur_ill_yy": "2025",
      "ref_physician": "Dr. Alice Smith",
      "id_physician": "1234567890",
      "physician number 17a1": "XYZ123",
      "physician number 17a": "NPI998877",
      "sim_ill_mm": "06",
      "sim_ill_dd": "20",
      "sim_ill_yy": "2025",
      "work_mm_from": "06",
      "work_dd_from": "01",
      "work_yy_from": "2025",
      "work_mm_end": "06",
      "work_dd_end": "30",
      "work_yy_end": "2025",
      "hosp_mm_from": "05",
      "hosp_dd_from": "15",
      "hosp_yy_from": "2025",
      "hosp_mm_end": "05",
      "hosp_dd_end": "20",
      "hosp_yy_end": "2025",
      "lab": "Yes",
      "charge": "150",
      "medicaid_resub": "N/A",
      "original_ref": "REF789",
      "prior_auth": "AUTH12345",
      "emg1": "Yes",
      "local1a": "ICD10",
      "sv1_mm_from": "07",
      "sv1_dd_from": "01",
      "sv1_yy_from": "2025",
      "sv1_mm_end": "07",
      "sv1_dd_end": "01",
      "sv1_yy_end": "2025",
      "diag1": "E11",
      "diag2": "E10",
      "ch1": "45",
      "ch2": "60",
      "day1": "1",
      "day2": "2",
      "place1": "11",
      "place2": "10",
      "assignment": "Yes",
      "t_charge": "150",
      "amt_paid": "0",
      "physician_signature": "Dr. Alice Smith",
      "physician_date": "08/07/2025",
      "fac_name": "Primary Clinic",
      "fac_street": "789 Health Way",
      "fac_location": "Brooklyn, NY 11201",
      "doc_name": "Dr. Alice Smith",
      "doc_street": "789 Health Way",
      "doc_location": "Brooklyn, NY 11201",
      "doc_phone area": "718",
      "doc_phone": "888 1234",
      "pin": "PIN123456",
      "grp": "GRP123456",
      "employment": "Yes",
      "pt_auto_accident": "Yes",
      "accident_place": "",
      "other_accident": "Yes",
      "other_ins_plan_name": "UnitedHealth",
      "diagnosis1": "E11",
      "diagnosis2": "E10",
      "type1": "1",
      "type2": "2",
      "type3": "3",
      "type4": "4",
      "cpt1": "99213",
      "cpt2": "93000",
      "mod1": "25",
      "mod2": "59",
      "mod1a": "AA",
      "mod2a": "BB",
      "mod1b": "CC",
      "mod2b": "DD",
      "mod1c": "EE",
      "mod2c": "FF",
      "plan1": "Plan A",
      "plan2": "Plan B",
      "epsdt1": "Yes",
      "epsdt2": "No"
    }
    

    for (const [key, value] of Object.entries(fieldValues)) {
      const field = form.getFieldMaybe(key);
      if (!field) continue;
    
      const type = field.constructor.name;
    
      try {
        if (type === 'PDFTextField') {
          // Auto-handle 2-character year fields
          if (key.endsWith('_yy') || key.endsWith('_yy_from') || key.endsWith('_yy_end')) {
            field.setText(value.slice(-2));
          } else {
            field.setText(value);
          }
        } else if (type === 'PDFDropdown' || type === 'PDFOptionList') {
          console.log(field.getName(),"dropdown");
          field.select(value);
        } else if (type === 'PDFCheckBox') {
          console.log(field.getName(),"checkbox");
          if (value === 'Yes' || value === true) field.check();
          else field.uncheck();
        }
      } catch (err) {
        console.warn(`⚠️ Failed to set field "${key}": ${err.message}`);
      }
    }

  // Optional: flatten form so it's not editable
  // form.flatten();

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('filled-cms1500.pdf', pdfBytes);

  console.log('✅ Form filled and saved as filled-cms1500.pdf');
}

autofillCMS1500().catch(console.error);
