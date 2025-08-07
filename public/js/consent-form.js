window.onload = function () {
  const form = document.getElementById('consentForm');
  const canvas = document.getElementById('signature-pad');
  const clearButton = document.getElementById('clear-signature');

  // Add layout class to canvas
  canvas.classList.add('signature-box');

  // Resize canvas then initialize SignaturePad
  resizeCanvas(canvas);
  const signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'white',
    penColor: 'black',
  });

  // Redraw signature on window resize
  window.addEventListener("resize", () => {
    const data = signaturePad.toData();
    resizeCanvas(canvas);
    signaturePad.clear();
    signaturePad.fromData(data);
  });

  // Clear signature
  clearButton.addEventListener('click', () => {
    signaturePad.clear();
  });

  // Handle form submission
  form.onsubmit = function () {
    if (!validateConsentForm()) return false;

    if (signaturePad.isEmpty()) {
      alert('Please sign the form before submitting.');
      return false;
    }

    // ✅ Convert canvas to image and replace it inline
    const signatureImage = signaturePad.toDataURL('image/png');
    const img = document.createElement('img');
    img.src = signatureImage;
    img.width = canvas.width / window.devicePixelRatio;
    img.height = canvas.height / window.devicePixelRatio;
    img.id = canvas.id;
    img.className = 'signature-box'; // 👈 Keep same styling as canvas

    // Replace canvas with image in DOM
    canvas.parentNode.replaceChild(img, canvas);

    // ✅ Set checkbox 'checked' attributes for PDF capture
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (cb.checked) {
        cb.setAttribute('checked', 'checked');
      } else {
        cb.removeAttribute('checked');
      }
    });

    // Allow DOM to update before capturing HTML
    setTimeout(() => {
      submitConsentForm();
    }, 200);

    return false;
  };
};

// Validate required checkboxes
function validateConsentForm() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"][required]');
  let allChecked = true;

  checkboxes.forEach(cb => {
    if (!cb.checked) {
      cb.style.outline = '2px solid #ef4444';
      allChecked = false;
    } else {
      cb.style.outline = 'none';
    }
  });

  if (!allChecked) {
    alert('Please check all required consent boxes.');
  }

  return allChecked;
}

// Extract token from URL
function getTokenFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

// Submit form via fetch
function submitConsentForm() {
  const token = getTokenFromURL();
  if (!token) {
    alert('The Given Link is expired or invalid');
    return;
  }

  // ✅ Update "Electronically Generated on" timestamp
  const generatedEl = document.getElementById('generated-timestamp');
  if (generatedEl) {
    const now = new Date();
    const formatted = now.toLocaleString(); // e.g., 8/1/2025, 11:59 PM
    generatedEl.textContent = `Electronically Generated on ${formatted}`;
  }

  // ✅ Ensure footer exists
  let footerEl = document.getElementById('footer-note');
  if (!footerEl) {
    footerEl = document.createElement('div');
    footerEl.id = 'footer-note';
    footerEl.style.cssText = 'background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 13px; color: #777;';
    const year = new Date().getFullYear();
    footerEl.textContent = `© ${year} VARN DIGIHEALTH. All rights reserved.`;
    document.body.appendChild(footerEl); // Or append to a specific container if needed
  }

  // ✅ Capture full HTML with timestamp/footer updated
  const data = {
    token,
    htmlContent: document.documentElement.outerHTML
  };

  fetch('/api/v1/ehr/consent-form', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then(response => {
      const submitButton = document.querySelector('#consentForm button[type="submit"]');
      if (response.ok) {
        alert('Consent Form Submitted Successfully!');
        if (submitButton) {
          submitButton.textContent = 'Submitted';
          submitButton.disabled = true;
        }
      } else {
        alert('There was an error submitting the form.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Submission failed. Please try again.');
    });
}


// Resize canvas for high-DPI screens
function resizeCanvas(canvas) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
}
