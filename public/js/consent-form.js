window.onload = function () {
  const form = document.getElementById('consentForm');
  const canvas = document.getElementById('signature-pad');
  const clearButton = document.getElementById('clear-signature');

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

    // ✅ Convert canvas to image and replace it inline (same position)
    const signatureImage = signaturePad.toDataURL('image/png');
    const img = document.createElement('img');
    img.src = signatureImage;
    img.style.cssText = canvas.style.cssText;
    img.width = canvas.width / window.devicePixelRatio;
    img.height = canvas.height / window.devicePixelRatio;
    img.id = canvas.id;

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

// Validate that required checkboxes are ticked
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
      if (response.ok) {
        alert('Consent Form Submitted Successfully!');
        const submitButton = document.querySelector('#consentForm button[type="submit"]');
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
