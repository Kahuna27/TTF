/**
 * Timbertop Fencing - Google Ads Conversion Tracking
 * Centralized conversion tracking for forms and phone calls
 */

// Conversion tracking configuration - Account: 8557425094
const CONVERSION_CONFIG = {
  GOOGLE_ADS_ID: 'AW-17717686162',
  FORM_CONVERSION_LABEL: 'IpjiCNmt3r8dEJLfuYBC',
  CALL_CONVERSION_LABEL: 'jnzGCNyt3r8dEJLfuYBC'
};

/**
 * Normalize Australian phone number to E.164 format (+61...)
 * Handles common formats: 04xx..., 07..., (07)..., 402346481, +61 04..., etc.
 */
function normalizePhoneToE164(phone) {
  if (!phone || typeof phone !== 'string') return null;
  
  let digits = phone.replace(/\D/g, '');
  
  if (digits.length < 9) return null;
  
  // Handle +61 0xxx typo (e.g. "+61 0402 346 481" -> remove the 0)
  if (phone.trim().startsWith('+61') && digits.length === 12 && digits.startsWith('610')) {
    digits = '61' + digits.substring(3);
  }
  
  // 9-digit mobile without leading 0 (e.g. "402346481")
  if (digits.length === 9 && digits.startsWith('4')) {
    return '+61' + digits;
  }
  
  // 10-digit starting with 0 (mobile or landline)
  if (digits.length === 10 && digits.startsWith('0')) {
    return '+61' + digits.substring(1);
  }
  
  // 11-digit starting with 61 (international without +)
  if (digits.length === 11 && digits.startsWith('61')) {
    return '+' + digits;
  }
  
  // Already correct format
  if (digits.length === 11 && phone.trim().startsWith('+61')) {
    return '+' + digits;
  }
  
  return null;
}

/**
 * Prepare Enhanced Conversions user data from form fields
 * Only sends email and phone_number (hashed by Google) for privacy compliance
 */
function prepareEnhancedConversionData(formData) {
  const userData = {};
  
  if (formData.email && formData.email.trim()) {
    userData.email = formData.email.trim().toLowerCase();
  }
  
  if (formData.phone && formData.phone.trim()) {
    const normalizedPhone = normalizePhoneToE164(formData.phone);
    if (normalizedPhone) {
      userData.phone_number = normalizedPhone;
    }
  }
  
  return userData;
}

/**
 * Fire Google Ads conversion event with Enhanced Conversions
 */
function fireConversion(conversionLabel, userData, callback) {
  if (typeof gtag === 'undefined') {
    if (callback) callback();
    return;
  }
  
  if (userData && Object.keys(userData).length > 0) {
    gtag('set', 'user_data', userData);
  }
  
  const conversionConfig = {
    'send_to': CONVERSION_CONFIG.GOOGLE_ADS_ID + '/' + conversionLabel,
    'transport_type': 'beacon'
  };
  
  if (callback) {
    let callbackFired = false;
    conversionConfig.event_callback = function() {
      if (!callbackFired) {
        callbackFired = true;
        callback();
      }
    };
    
    setTimeout(function() {
      if (!callbackFired) {
        callbackFired = true;
        callback();
      }
    }, 800);
  }
  
  gtag('event', 'conversion', conversionConfig);
}

/**
 * Handle form submission with AJAX and conversion tracking
 */
function handleFormSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  
  if (form.dataset.submitting === 'true') {
    return;
  }
  
  form.dataset.submitting = 'true';
  
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton ? submitButton.textContent : '';
  
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
  }
  
  const formData = new FormData(form);
  
  const userData = {
    name: formData.get('name') || '',
    phone: formData.get('phone') || '',
    email: formData.get('email') || '',
    address: formData.get('address') || ''
  };
  
  fetch(form.action, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json'
    }
  })
  .then(function(response) {
    if (response.ok) {
      const enhancedData = prepareEnhancedConversionData(userData);
      const nextUrl = formData.get('_next') || '/thank-you';
      
      fireConversion(CONVERSION_CONFIG.FORM_CONVERSION_LABEL, enhancedData, function() {
        window.location.href = nextUrl;
      });
    } else {
      return response.json().then(function(data) {
        throw new Error(data.error || 'Form submission failed');
      });
    }
  })
  .catch(function(error) {
    form.dataset.submitting = 'false';
    
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
    
    let errorDiv = form.querySelector('.form-error-message');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'form-error-message';
      errorDiv.style.cssText = 'color: #e74c3c; background: #fee; padding: 1rem; border-radius: 8px; margin-top: 1rem; border-left: 4px solid #e74c3c;';
      form.appendChild(errorDiv);
    }
    errorDiv.textContent = 'Sorry, there was an error submitting your form. Please try again or call us directly at 0402 346 481.';
  });
}

/**
 * Initialize phone tap (tel:) conversion tracking
 */
function initPhoneTapTracking() {
  document.addEventListener('click', function(event) {
    const anchor = event.target.closest('a[href^="tel:"]');
    
    if (anchor) {
      if (!sessionStorage.getItem('ttf_call_conversion_fired')) {
        sessionStorage.setItem('ttf_call_conversion_fired', 'true');
        
        if (typeof gtag !== 'undefined') {
          gtag('event', 'conversion', {
            'send_to': CONVERSION_CONFIG.GOOGLE_ADS_ID + '/' + CONVERSION_CONFIG.CALL_CONVERSION_LABEL,
            'transport_type': 'beacon'
          });
        }
      }
    }
  }, true);
}

/**
 * Initialize Formspree form tracking
 */
function initFormTracking() {
  const forms = document.querySelectorAll('form[action*="formspree.io"]');
  
  forms.forEach(function(form) {
    form.addEventListener('submit', handleFormSubmit);
  });
}

/**
 * Initialize all conversion tracking
 */
function initConversionTracking() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initPhoneTapTracking();
      initFormTracking();
    });
  } else {
    initPhoneTapTracking();
    initFormTracking();
  }
}

initConversionTracking();
