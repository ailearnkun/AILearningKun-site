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
  // ---------------------------------------------------------------------
  // Blog search — instant client-side filtering.
  // The searchable text lives on each card (data-search-text), so there is
  // no index file and no network request: results appear as you type.
  // Degrades gracefully — with JS off, the full list stays visible.
  // ---------------------------------------------------------------------
  var searchBox = document.querySelector("[data-blog-search]");

  if (searchBox) {
    var input = searchBox.querySelector(".search__input");
    var clearBtn = searchBox.querySelector(".search__clear");
    var statusEl = searchBox.querySelector(".search__status");
    var emptyEl = searchBox.querySelector(".search__empty");
    var list = document.querySelector("[data-search-list]");
    var items = list ? Array.prototype.slice.call(list.querySelectorAll("[data-search-item]")) : [];

    var msgNone = searchBox.getAttribute("data-msg-none") || "No results";
    var msgOne = searchBox.getAttribute("data-msg-one") || "1 result";
    var msgMany = searchBox.getAttribute("data-msg-many") || "results";

    var applyFilter = function () {
      var q = (input.value || "").trim().toLowerCase();
      var shown = 0;

      items.forEach(function (item) {
        var text = item.getAttribute("data-search-text") || "";
        var match = !q || text.indexOf(q) !== -1;
        item.hidden = !match;
        if (match) shown++;
      });

      if (clearBtn) clearBtn.hidden = !q;

      if (statusEl) {
        if (!q) {
          statusEl.hidden = true;
          statusEl.textContent = "";
        } else {
          statusEl.hidden = false;
          statusEl.textContent =
            shown === 0 ? msgNone
            : shown === 1 ? msgOne
            : shown + " " + msgMany;
        }
      }

      if (emptyEl) emptyEl.hidden = shown !== 0 || !q;
    };

    input.addEventListener("input", applyFilter);

    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        input.value = "";
        applyFilter();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        input.value = "";
        applyFilter();
        input.focus();
      });
    }
  }
})();
