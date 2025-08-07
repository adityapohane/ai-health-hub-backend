const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function listAllCMS1500Fields(pdfPath) {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  let form;
  try {
    form = pdfDoc.getForm();
  } catch (e) {
    console.error('❌ This PDF does not have an AcroForm.');
    return;
  }

  const fields = form.getFields();

  console.log('\n--- All Fields in CMS-1500 ---\n');

  fields.forEach(field => {
    const name = field.getName();
    const type = field.constructor.name;

    let value;
    try {
      if (type === 'PDFTextField') {
        value = field.getText();
      } else if (type === 'PDFCheckBox') {
        value = field.isChecked() ? 'Yes' : 'No';
      } else if (type === 'PDFDropdown' || type === 'PDFOptionList') {
        value = field.getSelected();
      } else {
        value = '(unknown)';
      }
    } catch {
      value = '(error)';
    }

    console.log(`${name.padEnd(30)} | ${type.padEnd(15)} | Value: ${value}`);
  });
}

listAllCMS1500Fields('./form-cms1500.pdf');
