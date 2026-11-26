/**
 * Timbertop Fencing - Google Ads Conversion Tracking
 * Centralized conversion tracking for forms and phone calls
 */

// Conversion tracking configuration
// Account: 8557425094
const CONVERSION_CONFIG = {
  GOOGLE_ADS_ID: 'AW-17717686162',
  FORM_CONVERSION_LABEL: 'IpjiCNmt3r8dEJLfuYBC',  // Website Quote Form
  CALL_CONVERSION_LABEL: 'jnzGCNyt3r8dEJLfuYBC'   // Website Phone Tap (tel:)
};

/**
 * Normalize Australian phone number to E.164 format (+61...)
 * Handles common formats: 04xx..., 07..., (07)..., etc.
 */
function normalizePhoneToE164(phone) {
  if (!phone || typeof phone !== 'string') return null;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle empty or too short numbers
  if (digits.length < 9) return null;
  
  // Australian mobile: starts with 04 (10 digits) -> +614...
  if (digits.length === 10 && digits.startsWith('04')) {
    return '+61' + digits.substring(1);
  }
  
  // Australian landline: starts with 0 followed by area code (10 digits) -> +61...
  if (digits.length === 10 && digits.startsWith('0')) {
    return '+61' + digits.substring(1);
  }
  
  // Already in international format starting with 61
  if (digits.length === 11 && digits.startsWith('61')) {
    return '+' + digits;
  }
  
  // Already has + prefix
  if (phone.trim().startsWith('+61')) {
    const cleanedDigits = phone.replace(/\D/g, '');
    if (cleanedDigits.length === 11) {
      return '+' + cleanedDigits;
    }
  }
  
  // Invalid format
  return null;
}

/**
 * Prepare Enhanced Conversions user data from form fields
 */
function prepareEnhancedConversionData(formData) {
  const userData = {};
  
  // Email - trim and lowercase
  if (formData.email && formData.email.trim()) {
    userData.email = formData.email.trim().toLowerCase();
  }
  
  // Phone - normalize to E.164
  if (formData.phone && formData.phone.trim()) {
    const normalizedPhone = normalizePhoneToE164(formData.phone);
    if (normalizedPhone) {
      userData.phone_number = normalizedPhone;
    }
  }
  
  // Address fields - only include if present
  const addressFields = {};
  
  if (formData.firstName && formData.firstName.trim()) {
    addressFields.first_name = formData.firstName.trim();
  }
  if (formData.lastName && formData.lastName.trim()) {
    addressFields.last_name = formData.lastName.trim();
  }
  
  // Parse name from single name field if first/last not separately provided
  if (!addressFields.first_name && !addressFields.last_name && formData.name && formData.name.trim()) {
    const nameParts = formData.name.trim().split(/\s+/);
    if (nameParts.length > 0) {
      addressFields.first_name = nameParts[0];
      if (nameParts.length > 1) {
        addressFields.last_name = nameParts.slice(1).join(' ');
      }
    }
  }
  
  if (formData.address && formData.address.trim()) {
    addressFields.street = formData.address.trim();
  }
  if (formData.city && formData.city.trim()) {
    addressFields.city = formData.city.trim();
  }
  if (formData.region && formData.region.trim()) {
    addressFields.region = formData.region.trim();
  }
  if (formData.postalCode && formData.postalCode.trim()) {
    addressFields.postal_code = formData.postalCode.trim();
  }
  
  // Always set country to AU for Australian business
  if (Object.keys(addressFields).length > 0) {
    addressFields.country = 'AU';
    userData.address = addressFields;
  }
  
  return userData;
}

/**
 * Fire Google Ads conversion event with Enhanced Conversions
 */
function fireConversion(conversionLabel, userData = {}) {
  if (typeof gtag === 'undefined') {
    console.warn('gtag is not loaded, cannot fire conversion');
    return;
  }
  
  // Set Enhanced Conversions user data if provided
  if (Object.keys(userData).length > 0) {
    gtag('set', 'user_data', userData);
  }
  
  // Fire the conversion event
  gtag('event', 'conversion', {
    'send_to': CONVERSION_CONFIG.GOOGLE_ADS_ID + '/' + conversionLabel
  });
  
  console.log('Conversion fired:', conversionLabel);
}

/**
 * Handle form submission with single-fire guard
 */
function handleFormSubmission(form) {
  // Single-fire guard using form attribute
  if (form.dataset.conversionFired === 'true') {
    console.log('Conversion already fired for this form submission');
    return;
  }
  
  // Mark conversion as fired
  form.dataset.conversionFired = 'true';
  
  // Collect form data
  const formData = {
    name: form.querySelector('[name="name"]')?.value || '',
    phone: form.querySelector('[name="phone"]')?.value || '',
    email: form.querySelector('[name="email"]')?.value || '',
    address: form.querySelector('[name="address"]')?.value || '',
    firstName: form.querySelector('[name="firstName"]')?.value || '',
    lastName: form.querySelector('[name="lastName"]')?.value || '',
    city: form.querySelector('[name="city"]')?.value || '',
    region: form.querySelector('[name="region"]')?.value || '',
    postalCode: form.querySelector('[name="postalCode"]')?.value || ''
  };
  
  // Prepare Enhanced Conversions data
  const userData = prepareEnhancedConversionData(formData);
  
  // Fire conversion
  fireConversion(CONVERSION_CONFIG.FORM_CONVERSION_LABEL, userData);
}

/**
 * Initialize phone tap (tel:) conversion tracking
 */
function initPhoneTapTracking() {
  // Use event delegation on document to catch all tel: links
  document.addEventListener('click', function(event) {
    // Find the closest anchor tag
    const anchor = event.target.closest('a[href^="tel:"]');
    
    if (anchor) {
      // Check if conversion already fired for this session
      const sessionKey = 'ttf_call_conversion_fired';
      
      if (!sessionStorage.getItem(sessionKey)) {
        // Mark as fired in session
        sessionStorage.setItem(sessionKey, 'true');
        
        // Fire conversion with beacon transport for reliability
        if (typeof gtag !== 'undefined') {
          gtag('event', 'conversion', {
            'send_to': CONVERSION_CONFIG.GOOGLE_ADS_ID + '/' + CONVERSION_CONFIG.CALL_CONVERSION_LABEL,
            'transport_type': 'beacon',
            'event_callback': function() {
              console.log('Phone call conversion tracked');
            }
          });
          
          console.log('Phone tap conversion fired');
        }
      }
    }
  }, true); // Use capture phase to ensure we catch the event
}

/**
 * Initialize Formspree form tracking
 * Formspree redirects to _next URL on success, so we track on the thank-you page
 */
function initFormspreeTracking() {
  const forms = document.querySelectorAll('form[action*="formspree.io"]');
  
  forms.forEach(form => {
    // For Formspree, we'll track on the thank-you page instead
    // This is more reliable than trying to intercept the redirect
    console.log('Formspree form detected - conversion will fire on thank-you page');
  });
}

/**
 * Check if we're on the thank-you page and should fire conversion
 */
function checkThankYouPage() {
  // Check if we're on the thank-you page
  if (window.location.pathname.includes('/thank-you')) {
    // Check if we came from a form submission
    const referer = document.referrer;
    const isFromForm = referer && (referer.includes('formspree.io') || referer.includes(window.location.hostname));
    
    // Check if conversion already fired for this thank-you page load
    const sessionKey = 'ttf_form_conversion_fired_' + Date.now();
    const recentConversion = sessionStorage.getItem('ttf_last_form_conversion');
    const timeSinceLastConversion = recentConversion ? (Date.now() - parseInt(recentConversion)) : Infinity;
    
    // Only fire if we haven't fired in the last 5 seconds (prevents double-fire on refresh)
    if (isFromForm && timeSinceLastConversion > 5000) {
      sessionStorage.setItem('ttf_last_form_conversion', Date.now().toString());
      
      // Fire conversion (no user data available on thank-you page, but conversion still counts)
      fireConversion(CONVERSION_CONFIG.FORM_CONVERSION_LABEL, {});
      
      console.log('Thank-you page form conversion fired');
    }
  }
}

/**
 * Initialize all conversion tracking
 */
function initConversionTracking() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initPhoneTapTracking();
      initFormspreeTracking();
      checkThankYouPage();
    });
  } else {
    initPhoneTapTracking();
    initFormspreeTracking();
    checkThankYouPage();
  }
}

// Auto-initialize
initConversionTracking();
