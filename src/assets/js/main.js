/* AI Learn Kun — minimal vanilla JS (no framework needed) */

(function () {
  "use strict";

  // Mobile navigation toggle
  var toggle = document.querySelector(".nav__toggle");
  var mobile = document.querySelector(".nav__mobile");

  if (toggle && mobile) {
    toggle.addEventListener("click", function () {
      var open = mobile.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    mobile.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobile.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Highlight the active nav item
  var here = window.location.pathname.replace(/index\.html$/, "");
  document.querySelectorAll(".nav__links a, .nav__mobile a").forEach(function (a) {
    var target = a.getAttribute("href");
    if (!target) return;
    if (target === here || (target !== "/" && here.indexOf(target) === 0)) {
      a.setAttribute("aria-current", "page");
    }
  });

  // ---------------------------------------------------------------------
  // Reveal-on-scroll.
  // Fail-safe by design: content is NEVER permanently hidden. The hidden
  // state lives in CSS behind `html.js` (so no-JS visitors see everything),
  // in-viewport items reveal immediately, and a hard timeout reveals
  // anything the observer missed. Decorative only — never load-bearing.
  // ---------------------------------------------------------------------
  var revealAll = function () {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      el.classList.add("is-revealed");
    });
  };

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce || !("IntersectionObserver" in window)) {
    revealAll();
    return;
  }

  var targets = document.querySelectorAll("[data-reveal]");

  if (targets.length) {
    // Flag JS as active so the CSS hidden state applies (and only then).
    document.documentElement.classList.add("js");

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach(function (el) { io.observe(el); });

    // Safety net: whatever the observer missed becomes visible regardless.
    window.setTimeout(revealAll, 2500);
    // Also reveal on any scroll/interaction failure path.
    window.addEventListener("load", function () {
      window.setTimeout(function () {
        targets.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) {
            el.classList.add("is-revealed");
          }
        });
      }, 120);
    });
  }
})();
