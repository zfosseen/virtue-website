document.addEventListener('DOMContentLoaded', function() {

    // ---- Counter Animation ----
    function animateCounter(el) {
        var countTo   = parseFloat(el.getAttribute('data-count') || '0');
        var countFrom = parseFloat(el.getAttribute('data-count-from') || '0');
        var prefix    = el.getAttribute('data-prefix') || '';
        var suffix    = el.getAttribute('data-suffix') || '';
        var separator = el.getAttribute('data-separator') || '';
        var isDecimal = (countTo % 1 !== 0) || (countFrom % 1 !== 0);
        var duration  = 1800;
        var start     = null;

        function fmt(val) {
            return isDecimal ? val.toFixed(1) : Math.round(val);
        }

        function step(timestamp) {
            if (!start) start = timestamp;
            var progress = Math.min((timestamp - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);

            if (separator) {
                var cur = Math.round(countFrom - (countFrom - countTo) * eased);
                el.textContent = countFrom + separator + cur;
            } else {
                el.textContent = prefix + fmt(countTo * eased) + suffix;
            }

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                if (separator) {
                    el.textContent = countFrom + separator + countTo;
                } else {
                    el.textContent = prefix + fmt(countTo) + suffix;
                }
            }
        }

        requestAnimationFrame(step);
    }

    var caseStudiesSection = document.querySelector('#case-studies');
    if (caseStudiesSection && 'IntersectionObserver' in window) {
        var countersAnimated = false;
        var counterObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && !countersAnimated) {
                    countersAnimated = true;
                    document.querySelectorAll('[data-counter]').forEach(function(el) {
                        animateCounter(el);
                    });
                    counterObserver.disconnect();
                }
            });
        }, { threshold: 0.25 });
        counterObserver.observe(caseStudiesSection);
    }


    var menuBtn = document.querySelector('.menu-btn');
    var nav = document.querySelector('.nav');

    if (menuBtn && nav) {
        menuBtn.addEventListener('click', function() {
            nav.classList.toggle('active');
            menuBtn.classList.toggle('active');
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var href = this.getAttribute('href');
            if (href === '#') return;
            e.preventDefault();
            var target = document.querySelector(href);
            if (target) {
                var offsetTop = target.offsetTop - 80;
                window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                if (nav && nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    if (menuBtn) menuBtn.classList.remove('active');
                }
            }
        });
    });

    // ---- Expandable Case Study Cards (click anywhere on card) ----
    document.querySelectorAll('.cs-mini-card').forEach(function(card) {
        card.addEventListener('click', function() {
            card.classList.toggle('expanded');
            var btn = card.querySelector('.cs-expand-btn');
            if (btn) btn.setAttribute('aria-label', card.classList.contains('expanded') ? 'Collapse' : 'Read more');
        });
    });

    // ---- Contact Form AJAX ----
    var contactForm = document.getElementById('contact-form');
    var submitBtn   = document.getElementById('form-submit');
    var errorBox    = document.getElementById('form-error');
    var successBox  = document.getElementById('form-success');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (errorBox) { errorBox.style.display = 'none'; errorBox.textContent = ''; }
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

            var data = {
                first_name: (contactForm.elements['first_name'] || {}).value || '',
                last_name:  (contactForm.elements['last_name']  || {}).value || '',
                email:      (contactForm.elements['email']      || {}).value || '',
                phone:      (contactForm.elements['phone']      || {}).value || '',
                company:    (contactForm.elements['company']    || {}).value || '',
                industry:   (contactForm.elements['industry']   || {}).value || '',
                message:    (contactForm.elements['message']    || {}).value || '',
            };

            fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            .then(function(res) { return res.json().then(function(json) { return { ok: res.ok, json: json }; }); })
            .then(function(result) {
                if (result.ok) {
                    if (contactForm)  { contactForm.style.display  = 'none'; }
                    if (successBox)   { successBox.style.display   = 'block'; }
                } else {
                    var msg = (result.json && result.json.error) ? result.json.error : 'Something went wrong. Please try again or email us directly.';
                    if (errorBox)  { errorBox.textContent = msg; errorBox.style.display = 'block'; }
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Message'; }
                }
            })
            .catch(function() {
                if (errorBox)  { errorBox.textContent = 'Network error. Please try again or email us directly.'; errorBox.style.display = 'block'; }
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Message'; }
            });
        });
    }
});
