// Enhanced JavaScript for Portfolio Website
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const header = document.querySelector('header');
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const heroSubtitle = document.getElementById('rotating-profession');
    const ctaBtn = document.querySelector('.cta-btn');
    const hireBtns = document.querySelectorAll('.hire-btn');
    const aboutBtns = document.querySelectorAll('.about-btn');
    const socialIcons = document.querySelectorAll('.social-icon');
    const themeToggle = document.getElementById('themeToggle');

    // Light / dark theme with a saved preference. Dark is the default.
    const svgAttrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    const SUN_ICON = `<svg ${svgAttrs}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
    const MOON_ICON = `<svg ${svgAttrs}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

    function applyTheme(theme) {
        const selectedTheme = theme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', selectedTheme);

        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
            themeMeta.setAttribute('content', selectedTheme === 'light' ? '#f5f8fc' : '#0a0a0a');
        }

        if (themeToggle) {
            const isDark = selectedTheme === 'dark';
            // Sun = "switch to light", moon = "switch to dark"
            themeToggle.innerHTML = isDark ? SUN_ICON : MOON_ICON;
            const actionLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';
            themeToggle.setAttribute('aria-label', actionLabel);
            themeToggle.setAttribute('title', actionLabel);
        }

        try {
            localStorage.setItem('portfolio-theme', selectedTheme);
        } catch (error) {
            // The theme still works if browser storage is unavailable.
        }
    }

    let savedTheme = 'dark';
    try {
        savedTheme = localStorage.getItem('portfolio-theme') || 'dark';
    } catch (error) {
        // Use dark mode when browser storage is unavailable.
    }
    applyTheme(savedTheme);
    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    // Professions for typewriter effect
    const professions = [
        'Full-Stack Developer',
        'Frontend Engineer', 
        'Backend Developer',
        'UI/UX Enthusiast',
        'Problem Solver',
        'Tech Innovator'
    ];

    // Typewriter Effect
    let professionIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 150;

    function typeWriter() {
        if (!heroSubtitle) return;
        
        const currentProfession = professions[professionIndex];
        
        if (isDeleting) {
            heroSubtitle.innerHTML = "I'm a " + currentProfession.substring(0, charIndex - 1) + '<span class="cursor">|</span>';
            charIndex--;
            typingSpeed = 75;
        } else {
            heroSubtitle.innerHTML = "I'm a " + currentProfession.substring(0, charIndex + 1) + '<span class="cursor">|</span>';
            charIndex++;
            typingSpeed = 150;
        }

        if (!isDeleting && charIndex === currentProfession.length) {
            typingSpeed = 2000; // Pause at end
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            professionIndex = (professionIndex + 1) % professions.length;
            typingSpeed = 500; // Pause before next word
        }

        setTimeout(typeWriter, typingSpeed);
    }

    // Mobile Menu Toggle
    function toggleMobileMenu() {
        hamburger?.classList.toggle('active');
        navMenu?.classList.toggle('active');
        const isOpen = !!navMenu?.classList.contains('active');
        document.body.classList.toggle('menu-open', isOpen);
        if (hamburger) {
            hamburger.setAttribute('aria-expanded', String(isOpen));
            hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
        }
    }

    // Smooth scroll to a section, leaving room for the fixed header
    function scrollToSection(targetId) {
        if (!targetId || !targetId.startsWith('#')) return false;
        const targetElement = document.querySelector(targetId);
        if (!targetElement) return false;

        // Close the mobile menu first so the page can scroll again
        if (navMenu?.classList.contains('active')) {
            toggleMobileMenu();
        }

        const headerHeight = header?.offsetHeight || 80;
        const top = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight + 1;
        window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });

        updateActiveNavLink(targetId);
        return true;
    }

    function smoothScroll(event) {
        event.preventDefault();
        scrollToSection(this.getAttribute('href'));
    }

    // Update Active Navigation Link
    function updateActiveNavLink(activeId) {
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === activeId) {
                link.classList.add('active');
            }
        });
    }

    // Scroll-based Header Effects
    function handleScroll() {
        const scrollY = window.scrollY;
        
        if (scrollY > 50) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }
    }

    // Scroll-based Active Navigation
    function updateActiveNavFromScroll() {
        const sections = document.querySelectorAll('section[id]');
        // +32 tolerance: the header shrinks after scrolling, so a section can sit a few px below it
        const scrollPosition = window.scrollY + (header?.offsetHeight || 80) + 32;

        let activeSection = null;
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                activeSection = section;
            }
        });

        if (activeSection) {
            const id = '#' + activeSection.getAttribute('id');
            updateActiveNavLink(id);
            
            // Keep the URL hash in sync without adding a history entry per section
            if (history.replaceState && window.location.hash !== id) {
                history.replaceState(null, '', id);
            }
        } else if (scrollPosition < 100) {
            updateActiveNavLink('#home');
        }
    }

    // Throttled scroll listener
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateActiveNavFromScroll, 50);
    });

    // Intersection Observer for Animations
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                
                // Add stagger effect for multiple elements
                const siblings = entry.target.parentElement?.querySelectorAll('.animate-on-scroll');
                if (siblings && siblings.length > 1) {
                    siblings.forEach((sibling, index) => {
                        setTimeout(() => {
                            sibling.style.opacity = '1';
                            sibling.style.transform = 'translateY(0)';
                        }, index * 100);
                    });
                }
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Setup animations for elements
    function setupAnimations() {
        const animatedElements = document.querySelectorAll(
            '.hero-stats .stat, .about-highlights .highlight, .floating-card, .social-icon'
        );
        
        animatedElements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            el.style.transitionDelay = `${index * 0.1}s`;
            
            animationObserver.observe(el);
        });
    }

    // Button Click Handlers
    function handleButtonClick(event) {
        const button = event.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);

        // "Let's Talk" and "Hire Me": jump to the contact form
        if (button.hasAttribute('data-scroll-to')) {
            event.preventDefault();
            scrollToSection(button.getAttribute('data-scroll-to'));

            if (button.hasAttribute('data-hire')) {
                const subject = document.getElementById('subject');
                if (subject && !subject.value) {
                    subject.value = 'Hiring inquiry';
                }
            }
        }

        // "Download CV": the browser downloads the file from the link; just confirm it
        if (button.hasAttribute('download')) {
            showNotification('Your CV is downloading...', 'success');
        }
    }

    // Notification System
    function showNotification(message, type = 'info') {
        document.querySelectorAll('.notification').forEach(n => n.remove());

        const icons = { info: 'fa-info-circle', success: 'fa-check-circle', error: 'fa-exclamation-circle' };
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.setAttribute('role', 'status');

        const icon = document.createElement('i');
        icon.className = `fas ${icons[type] || icons.info}`;
        icon.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        text.textContent = message;
        notification.append(icon, text);

        document.body.appendChild(notification);
        requestAnimationFrame(() => requestAnimationFrame(() => notification.classList.add('show')));

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 350);
        }, 3200);
    }

    // Keyboard Navigation
    function handleKeyboard(event) {
        // Close mobile menu on Escape
        if (event.key === 'Escape' && navMenu?.classList.contains('active')) {
            toggleMobileMenu();
        }
        
        // Navigate with arrow keys when menu is open
        if (navMenu?.classList.contains('active') && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            const currentActive = document.querySelector('.nav-link:focus') || document.querySelector('.nav-link.active');
            const navLinksArray = Array.from(navLinks);
            const currentIndex = navLinksArray.indexOf(currentActive);
            
            let nextIndex;
            if (event.key === 'ArrowDown') {
                nextIndex = (currentIndex + 1) % navLinksArray.length;
            } else {
                nextIndex = currentIndex <= 0 ? navLinksArray.length - 1 : currentIndex - 1;
            }
            
            navLinksArray[nextIndex]?.focus();
        }
    }

    // Performance Optimized Scroll Handler
    let ticking = false;
    function optimizedScrollHandler() {
        if (!ticking) {
            requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    }

    // Debounced Resize Handler
    let resizeTimeout;
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Close mobile menu on resize to larger screen
            if (window.innerWidth > 1024 && navMenu?.classList.contains('active')) {
                toggleMobileMenu();
            }
        }, 250);
    }

    // Initialize Active Navigation from Hash
    function initializeActiveNav() {
        const hash = window.location.hash || '#home';
        updateActiveNavLink(hash);
        
        // Smooth scroll to section if hash exists
        if (hash !== '#home') {
            setTimeout(() => {
                const targetElement = document.querySelector(hash);
                if (targetElement) {
                    const headerHeight = header?.offsetHeight || 80;
                    window.scrollTo({
                        top: targetElement.offsetTop - headerHeight,
                        behavior: 'smooth'
                    });
                }
            }, 500);
        }
    }

    // Event Listeners
    hamburger?.addEventListener('click', toggleMobileMenu);
    navLinks.forEach(link => {
        link.addEventListener('click', smoothScroll);
        link.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                link.click();
            }
        });
    });

    // Button event listeners
    [ctaBtn, ...hireBtns, ...aboutBtns].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', handleButtonClick);
        }
    });

    // Placeholder links (href="#") should not jump to the top of the page
    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener('click', event => event.preventDefault());
    });

    // Social icons hover effects
    socialIcons.forEach(icon => {
        icon.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.1)';
        });
        
        icon.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Global event listeners
    window.addEventListener('scroll', optimizedScrollHandler);
    window.addEventListener('resize', handleResize);
    window.addEventListener('hashchange', initializeActiveNav);
    document.addEventListener('keydown', handleKeyboard);

    // Handle clicks outside mobile menu
    document.addEventListener('click', (event) => {
        if (navMenu?.classList.contains('active') && 
            !event.composedPath().includes(navMenu) &&
            !event.composedPath().includes(hamburger) &&
            !event.composedPath().includes(themeToggle)) {
            toggleMobileMenu();
        }
    });

    // Initialize everything
    function init() {
        // Start typewriter effect
        if (heroSubtitle) {
            typeWriter();
        }
        
        // Setup animations
        setupAnimations();
        
        // Initialize navigation
        initializeActiveNav();
        
        // Initial scroll check
        handleScroll();
        
        // Add loaded class for CSS animations
        setTimeout(() => {
            document.body.classList.add('loaded');
        }, 100);
        
        console.log('Portfolio website initialized successfully! 🚀');
    }

    // Contact form handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            // Simple validation
            if (!data.name || !data.email || !data.subject || !data.message) {
                showNotification('Please fill in all fields', 'error');
                return;
            }

            // Simulate form submission (replace with actual API call)
            console.log('Form submitted:', data);

            // Show success message
            showNotification('Thank you for your message! I will get back to you soon.', 'success');

            // Reset form
            this.reset();
        });
    }

    // Initialize the application
    init();
});

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            console.log(`Page loaded in ${pageLoadTime}ms`);
        }, 0);
    });
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('JavaScript Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
});

// Service Worker Registration (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment if you have a service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered'))
        //     .catch(error => console.log('SW registration failed'));
    });
}