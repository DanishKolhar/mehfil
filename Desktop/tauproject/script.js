document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. STICKY NAVBAR & ACTIVE LINK HIGHLIGHTING
  // ==========================================
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-links a');
  const sections = document.querySelectorAll('section, header');

  const handleScroll = () => {
    // Sticky navbar
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Active link highlighting
    let currentSectionId = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120; // offset for sticky header
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  };

  window.addEventListener('scroll', handleScroll);
  handleScroll(); // Trigger on load to set initial state

  // ==========================================
  // 2. MOBILE MENU DRAWER TOGGLE
  // ==========================================
  const menuToggle = document.getElementById('menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  const menuLines = {
    line1: document.getElementById('line1'),
    line2: document.getElementById('line2'),
    line3: document.getElementById('line3')
  };

  const toggleMobileMenu = () => {
    const isOpen = mobileNav.classList.contains('open');
    if (isOpen) {
      // Close Menu
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';

      // Animate hamburger back to normal
      menuLines.line1.setAttribute('x1', '4');
      menuLines.line1.setAttribute('y1', '12');
      menuLines.line1.setAttribute('x2', '20');
      menuLines.line1.setAttribute('y2', '12');

      menuLines.line2.style.opacity = '1';

      menuLines.line3.setAttribute('x1', '4');
      menuLines.line3.setAttribute('y1', '18');
      menuLines.line3.setAttribute('x2', '20');
      menuLines.line3.setAttribute('y2', '18');
    } else {
      // Open Menu
      mobileNav.classList.add('open');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling

      // Animate hamburger to close (X) shape
      menuLines.line1.setAttribute('x1', '5');
      menuLines.line1.setAttribute('y1', '5');
      menuLines.line1.setAttribute('x2', '19');
      menuLines.line1.setAttribute('y2', '19');

      menuLines.line2.style.opacity = '0';

      menuLines.line3.setAttribute('x1', '5');
      menuLines.line3.setAttribute('y1', '19');
      menuLines.line3.setAttribute('x2', '19');
      menuLines.line3.setAttribute('y2', '5');
    }
  };

  menuToggle.addEventListener('click', toggleMobileMenu);

  // Close mobile drawer when link is clicked
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      toggleMobileMenu();
    });
  });

  // ==========================================
  // 3. SMOOTH SCROLL INTERCEPTOR
  // ==========================================
  const allScrollLinks = document.querySelectorAll('a[href^="#"]');
  allScrollLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return; // Ignore empty links

      e.preventDefault();
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const offset = 90; // offset adjustment for fixed navbar height
        const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ==========================================
  // 4. SCROLL REVEAL ANIMATIONS (INTERSECTIONOBSERVER)
  // ==========================================
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Once element reveals, unobserve it so animation doesn't repeat on scroll back
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12, // reveal when 12% visible
    rootMargin: '0px 0px -40px 0px' // offset bottom trigger point slightly
  });

  revealElements.forEach(element => {
    revealObserver.observe(element);
  });

  // ==========================================
  // 5. STATS COUNTER ANIMATOR
  // ==========================================
  const statsSection = document.getElementById('why-choose-us');
  const statNumbers = document.querySelectorAll('.stat-number');
  let statsAnimated = false;

  const animateCounters = () => {
    statNumbers.forEach(stat => {
      const target = +stat.getAttribute('data-target');
      const suffix = stat.parentElement.id === 'stat-quality' ? '%' : '+';
      const duration = 1500; // time in ms
      const startTime = performance.now();

      const updateCounter = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        // Easing out quadratic function
        const easedProgress = progress * (2 - progress);

        const currentValue = Math.floor(easedProgress * target);
        stat.textContent = `${currentValue}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          stat.textContent = `${target}${suffix}`;
        }
      };

      requestAnimationFrame(updateCounter);
    });
  };

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !statsAnimated) {
        animateCounters();
        statsAnimated = true;
        statsObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.3
  });

  if (statsSection) {
    statsObserver.observe(statsSection);
  }

  // ==========================================
  // 6. SEND US A MESSAGE FORM & EMAILJS INTEGRATION
  // ==========================================

  // EmailJS Configuration
  // IMPORTANT: Replace these with your actual EmailJS credentials from https://dashboard.emailjs.com/
  // ==========================================
// EMAILJS CONFIGURATION
// ==========================================

const EMAILJS_PUBLIC_KEY = 'KofFw8I-VdQNx6dwq';
const EMAILJS_SERVICE_ID = 'service_u99x9z3';
const EMAILJS_TEMPLATE_ID = 'template_9y5cdtb';

// Initialize EmailJS
if (typeof emailjs !== 'undefined') {
  emailjs.init({
    publicKey: EMAILJS_PUBLIC_KEY
  });

  console.log('EmailJS initialized successfully');
} else {
  console.error('EmailJS library not loaded');
}

  const enquiryForm = document.getElementById('enquiry-form');
  const submitBtn = document.getElementById('btn-submit-enquiry');
  const successOverlay = document.getElementById('form-success-overlay');

  if (enquiryForm) {
    const fullnameInput = document.getElementById('fullname');
    const phoneInput = document.getElementById('phone');
    const locationInput = document.getElementById('location');
    const requirementsInput = document.getElementById('requirements');
    const serviceCheckboxes = enquiryForm.querySelectorAll('input[name="services"]');

    // Helper to validate and toggle error classes
    const validateField = (inputElement, groupElementId, condition) => {
      const groupElement = document.getElementById(groupElementId);
      if (!groupElement) return condition;

      if (!condition) {
        groupElement.classList.add('has-error');
      } else {
        groupElement.classList.remove('has-error');
      }
      return condition;
    };

    // Remove error highlights on input changes to improve UX
    if (fullnameInput) {
      fullnameInput.addEventListener('input', () => {
        validateField(fullnameInput, 'group-fullname', fullnameInput.value.trim() !== '');
      });
    }

    if (phoneInput) {
      phoneInput.addEventListener('input', () => {
        validateField(phoneInput, 'group-phone', phoneInput.value.trim() !== '');
      });
    }

    if (requirementsInput) {
      requirementsInput.addEventListener('input', () => {
        validateField(requirementsInput, 'group-requirements', requirementsInput.value.trim() !== '');
      });
    }

    serviceCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const anyChecked = Array.from(serviceCheckboxes).some(cb => cb.checked);
        validateField(null, 'group-services', anyChecked);
      });
    });

    enquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Perform validation
      const isNameValid = validateField(fullnameInput, 'group-fullname', fullnameInput.value.trim() !== '');
      const isPhoneValid = validateField(phoneInput, 'group-phone', phoneInput.value.trim() !== '');
      const isRequirementsValid = validateField(requirementsInput, 'group-requirements', requirementsInput.value.trim() !== '');

      const selectedServices = Array.from(serviceCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      const isServicesValid = validateField(null, 'group-services', selectedServices.length > 0);

      // If any field is invalid, stop submission
      if (!isNameValid || !isPhoneValid || !isRequirementsValid || !isServicesValid) {
        // Scroll the first error element into view smoothly
        const firstError = enquiryForm.querySelector('.has-error');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // Disable submit button and show loading state
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending Enquiry...';

      // Build parameters
      const templateParams = {
        customer_name: fullnameInput.value.trim(),
        phone_number: phoneInput.value.trim(),
        project_location: locationInput.value.trim() || 'Not Specified',
        selected_services: selectedServices.join(', '),
        project_details: requirementsInput.value.trim(),
        to_email: 'askolhar722@gmail.com'
      };

      // Execution handling (Mock or EmailJS)
      const isMockMode = !EMAILJS_PUBLIC_KEY ||
        EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY' ||
        EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' ||
        EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID';

      if (isMockMode) {
        // Simulated successful submission for development/testing
        console.group('%c[Enquiry Form Submit (MOCK MODE)]', 'color: #D4AF37; font-weight: bold;');
        console.log('Recipient Email:', templateParams.to_email);
        console.log('Customer Name:', templateParams.customer_name);
        console.log('Phone Number:', templateParams.phone_number);
        console.log('Project Location:', templateParams.project_location);
        console.log('Services Selected:', selectedServices);
        console.log('Requirements Details:', templateParams.project_details);
        console.groupEnd();

        setTimeout(() => {
          // Show success overlay
          if (successOverlay) {
            successOverlay.classList.add('show');
          }
          // Reset form
          enquiryForm.reset();
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }, 1000);
      } else {
        // Send email via EmailJS browser SDK
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
          .then((response) => {
            console.log('EmailJS Success Status:', response.status, response.text);
            if (successOverlay) {
              successOverlay.classList.add('show');
            }
            enquiryForm.reset();
          })
          .catch((error) => {
            console.error('EmailJS Error:', error);
            alert('Oops! There was an issue sending your enquiry. Please check your credentials or try again later.');
          })
          .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
          });
      }
    });
  }
});
