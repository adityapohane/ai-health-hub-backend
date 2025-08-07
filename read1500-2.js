const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function readPdfFields(pdfPath) {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  let form;
  try {
    form = pdfDoc.getForm(); // This will throw if no AcroForm exists
  } catch (err) {
    console.error('❌ This PDF does not contain AcroForm fields.');
    return;
  }

  const fields = form.getFields();

  console.log('\n--- CMS-1500 Form Field Values ---\n');

  fields.forEach(field => {
    const name = field.getName();
    let value = '';

    try {
      switch (field.constructor.name) {
        case 'PDFTextField':
          value = field.getText();
          break;
        case 'PDFCheckBox':
          value = field.isChecked() ? 'Yes' : 'No';
          break;
        case 'PDFDropdown':
        case 'PDFOptionList':
          value = field.getSelected();
          break;
        default:
          value = '(Unknown field type)';
      }
    } catch (e) {
      value = '(Error reading field)';
    }

    console.log(`${name}: ${value}`);
  });
}

readPdfFields('./filled-cms1500.pdf'); // or './form-cms1500.pdf'
