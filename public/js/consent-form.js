window.onload = function () {
    var form = document.getElementById('consentForm');
  
    form.onsubmit = function () {
      if (validateConsentForm()) {
        submitConsentForm();
      }
      return false;
    };
  };
  
  function validateConsentForm() {
    var checkboxes = document.querySelectorAll('input[type="checkbox"][required]');
    var allChecked = true;
  
    for (var i = 0; i < checkboxes.length; i++) {
      if (!checkboxes[i].checked) {
        checkboxes[i].style.outline = '2px solid #ef4444';
        allChecked = false;
      } else {
        checkboxes[i].style.outline = 'none';
      }
    }
  
    if (!allChecked) {
      alert('Please check all required consent boxes.');
    }
  
    return allChecked;
  }
  
  function getTokenFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  }
  function submitConsentForm() {
    var form = document.getElementById('consentForm');
    var formData = new FormData(form);
    var data = {};
  
    formData.forEach(function (value, key) {
      data[key] = value;
    });
  
    const token = getTokenFromURL();
    if (!token) {
      alert('The Given Link is expired or invalid');
      return;
    }
    data.token = token;
  
    // ✅ Set checked attributes for checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (cb.checked) {
        cb.setAttribute('checked', 'checked');
      } else {
        cb.removeAttribute('checked');
      }
    });
  
    // ✅ Get final HTML snapshot
    data.htmlContent = document.documentElement.outerHTML;
  
    fetch('/api/v1/ehr/consent-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
      .then(function (response) {
        if (response.ok) {
          alert('Consent Form Submitted Successfully!');
  
          // ✅ Disable and change button text
          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton) {
            submitButton.textContent = 'Submitted';
            submitButton.disabled = true;
          }
  
        } else {
          alert('There was an error submitting the form.');
        }
      })
      .catch(function (error) {
        console.error('Error:', error);
        alert('Submission failed. Please try again.');
      });
  }
  // function submitConsentForm2() {
  //   var form = document.getElementById('consentForm');
  //   var formData = new FormData(form);
  //   var data = {};
  
  //   formData.forEach(function (value, key) {
  //     data[key] = value;
  //   });
  
  //   const token = getTokenFromURL();
  //   if (!token) {
  //     alert('The Given Link is expired or invalid');
  //     return;
  //   }
  //   data.token = token;
  
  //   // ✅ Inject `checked` into the actual HTML elements
  //   const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  //   checkboxes.forEach(cb => {
  //     if (cb.checked) {
  //       cb.setAttribute('checked', 'checked');
  //     } else {
  //       cb.removeAttribute('checked');
  //     }
  //   });
  
  //   // ✅ Now capture the HTML with checkboxes as checked
  //   data.htmlContent = document.documentElement.outerHTML;
  
  //   fetch('/api/v1/ehr/consent-form', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify(data),
  //   })
  //     .then(function (response) {
  //       if (response.ok) {
  //         alert('Consent Form Submitted Successfully!');
  //       } else {
  //         alert('There was an error submitting the form.');
  //       }
  //     })
  //     .catch(function (error) {
  //       console.error('Error:', error);
  //       alert('Submission failed. Please try again.');
  //     });
  // }//working
  // function submitConsentForm() {
  //   var form = document.getElementById('consentForm');
  //   var formData = new FormData(form);
  //   var data = {};
  
  //   formData.forEach(function (value, key) {
  //     data[key] = value;
  //   });
  
  //   // ➕ Add token from query string to the body
  //   const token = getTokenFromURL();
  //   if (token) {
  //     data.token = token;
  //   }else{
  //       alert('The Given Link is expired or invalid');
  //       return;
  //   }
  //   data.htmlContent = document.documentElement.outerHTML;
  //   fetch('/api/v1/ehr/consent-form', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify(data),
  //   })
  //     .then(function (response) {
  //       if (response.ok) {
  //         alert('Consent Form Submitted Successfully!');
  //       } else {
  //         alert('There was an error submitting the form.');
  //       }
  //     })
  //     .catch(function (error) {
  //       console.error('Error:', error);
  //       alert('Submission failed. Please try again.');
  //     });
  // }
  