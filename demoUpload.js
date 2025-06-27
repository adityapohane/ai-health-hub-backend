const uploadFileToS3 = require("./utils/s3Upload.js");

(async () => {
  try {
    const uploadedUrl = await uploadFileToS3(
      "./demo-upload.pdf",
      "varn-dev",
      "care-plan/firstcareplan.pdf"
    );
    console.log("File uploaded at:", uploadedUrl);
  } catch (err) {
    console.error("Upload failed:", err);
  }
})();
