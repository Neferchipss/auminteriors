(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  /* Landing logo: plays centered, then the chroma-removed still shrinks/moves left (no black box);
     once resting, scrolling crossfades it into the header ribbon logo. */
  (function () {
    if (!document.body.classList.contains("has-logo-intro")) return;
    var wrap = document.getElementById("hero-logo-intro");
    var video = document.getElementById("hero-logo-video");
    var backdrop = document.getElementById("hero-logo-backdrop");
    var headerLogo = document.querySelector("header.site-header .logo");
    if (!wrap || !video || !headerLogo) return;

    if (reduced) {
      wrap.querySelector("video").style.display = "none";
      wrap.querySelector("img").style.display = "block";
      if (backdrop) backdrop.classList.add("backdrop-out");
      headerLogo.style.opacity = "1";
      return;
    }

    var settled = false;
    var restParams = null;
    var ended = false;

    function computeRest() {
      var rect = wrap.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var restScale = 0.95;
      var leftPad = Math.min(96, Math.max(24, window.innerWidth * 0.07));
      var restWidth = rect.width * restScale;
      var targetCenterX = leftPad + restWidth / 2;
      return { dx: targetCenterX - centerX, dy: 0, scale: restScale };
    }

    function onEnded() {
      if (ended) return;
      ended = true;
      restParams = computeRest();
      wrap.classList.add("intro-swapped", "intro-animate");
      if (backdrop) backdrop.classList.add("backdrop-out");
      requestAnimationFrame(function () {
        wrap.style.transform = "translate(-50%,-50%) translate(" + restParams.dx + "px," + restParams.dy + "px) scale(" + restParams.scale + ")";
      });
      setTimeout(function () {
        wrap.classList.remove("intro-animate");
        settled = true;
      }, 950);
    }

    video.addEventListener("ended", onEnded);
    setTimeout(onEnded, 3200);

    var fadeRange = 280;
    var raf = null;
    var onScroll = function () {
      raf = null;
      var progress = Math.max(0, Math.min(1, window.scrollY / fadeRange));
      headerLogo.style.opacity = String(progress);
      if (settled && restParams) {
        var lift = -20 * progress;
        var extraShrink = 0.08 * progress;
        wrap.style.opacity = String(1 - progress);
        wrap.style.transform = "translate(-50%,-50%) translate(" + restParams.dx + "px," + (restParams.dy + lift) + "px) scale(" + (restParams.scale - extraShrink) + ")";
      }
    };
    document.addEventListener("scroll", function () {
      if (!raf) raf = requestAnimationFrame(onScroll);
    }, { passive: true });
    onScroll();
  })();

  /* Subtle hero parallax */
  if (!reduced) {
    var parallaxEls = document.querySelectorAll(".parallax");
    if (parallaxEls.length) {
      var rafP = null;
      var onParallax = function () {
        rafP = null;
        parallaxEls.forEach(function (el) {
          var rect = el.parentElement.getBoundingClientRect();
          var progress = -rect.top / (rect.height || 1);
          var range = rect.height * 0.06;
          var y = Math.max(-range, Math.min(range, progress * range));
          el.style.transform = "translateY(" + y + "px)";
        });
      };
      document.addEventListener("scroll", function () {
        if (!rafP) rafP = requestAnimationFrame(onParallax);
      }, { passive: true });
      onParallax();
    }
  }

  /* Scroll-triggered video: plays once in view, reveals adjacent text after a beat */
  document.querySelectorAll(".scroll-video").forEach(function (vid) {
    var wrap = vid.closest(".knob-media") || vid.parentElement;
    var section = vid.closest("section");
    var texts = section ? section.querySelectorAll(".reveal-text") : [];
    var triggered = false;
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          vid.play().catch(function () {});
          wrap.classList.add("is-playing");
          setTimeout(function () {
            texts.forEach(function (t, i) {
              setTimeout(function () { t.classList.add("in-view"); }, i * 140);
            });
          }, 450);
          io2.unobserve(vid);
        }
      });
    }, { threshold: 0.45 });
    io2.observe(vid);
  });

  /* Explicit play() for autoplay background videos (some contexts ignore the attribute) */
  document.querySelectorAll(".hero-media video[autoplay], .p-hero video[autoplay], .hero-logo-intro video[autoplay]").forEach(function (v) {
    var tryPlay = function () { v.play().catch(function () {}); };
    if (v.readyState >= 2) tryPlay();
    v.addEventListener("loadeddata", tryPlay);
    v.addEventListener("canplay", tryPlay);
    window.addEventListener("pageshow", tryPlay);
  });

  /* Header solidify + glass scroll rail (single scroll listener, rAF-throttled) */
  var header = document.querySelector(".site-header");
  var rail = document.createElement("div");
  rail.className = "scroll-rail";
  rail.innerHTML = "<span></span>";
  document.body.appendChild(rail);
  var railFill = rail.querySelector("span");

  var rafH = null;
  var onHeadScroll = function () {
    rafH = null;
    var y = window.scrollY;
    if (header) header.classList.toggle("solid", y > 40);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    railFill.style.width = (max > 0 ? Math.min(1, y / max) * 100 : 0) + "%";
  };
  document.addEventListener("scroll", function () {
    if (!rafH) rafH = requestAnimationFrame(onHeadScroll);
  }, { passive: true });
  window.addEventListener("resize", onHeadScroll);
  onHeadScroll();

  /* Mobile nav toggle */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
      });
    });
  }

  /* Scroll reveal */
  var targets = document.querySelectorAll(".reveal:not(.in-view), .reveal-text:not(.in-view)");
  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (t) { t.classList.add("in-view"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -60px 0px" }
    );
    targets.forEach(function (t) { io.observe(t); });
  }

  /* Magnetic buttons (desktop only) */
  if (!isTouch && !reduced) {
    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        btn.style.transform = "translate(" + x * 0.18 + "px," + (y * 0.28 - 2) + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  }

  /* Cursor dot */
  if (!isTouch && !reduced) {
    var dot = document.createElement("div");
    dot.className = "cursor-dot";
    document.body.appendChild(dot);
    var raf = null, mx = 0, my = 0;
    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.classList.add("show");
      if (!raf) {
        raf = requestAnimationFrame(function () {
          dot.style.left = mx + "px";
          dot.style.top = my + "px";
          raf = null;
        });
      }
    });
    document.addEventListener("mouseleave", function () { dot.classList.remove("show"); });
    document.querySelectorAll(".frame, .btn, a").forEach(function (el) {
      el.addEventListener("mouseenter", function () { dot.classList.add("grow"); });
      el.addEventListener("mouseleave", function () { dot.classList.remove("grow"); });
    });
  }

  /* Hover-to-play project card previews (desktop only) */
  if (!isTouch) {
    document.querySelectorAll(".hover-video").forEach(function (vid) {
      var card = vid.closest(".p-card");
      if (!card) return;
      card.addEventListener("mouseenter", function () {
        vid.currentTime = 0;
        var p = vid.play();
        if (p && p.then) p.then(function () { vid.classList.add("playing"); }).catch(function () {});
        else vid.classList.add("playing");
      });
      card.addEventListener("mouseleave", function () {
        vid.classList.remove("playing");
        vid.pause();
      });
    });
  }

  /* Click-to-play video frames */
  document.querySelectorAll(".video-frame").forEach(function (wrap) {
    var vid = wrap.querySelector("video");
    var playBtn = wrap.querySelector(".video-play");
    if (!vid || !playBtn) return;
    playBtn.addEventListener("click", function () {
      vid.controls = true;
      vid.play();
      playBtn.classList.add("hidden");
    });
    vid.addEventListener("pause", function () { playBtn.classList.remove("hidden"); });
    vid.addEventListener("play", function () { playBtn.classList.add("hidden"); });
  });

  /* Lightbox gallery */
  var groups = {};
  document.querySelectorAll("[data-lightbox]").forEach(function (el, idx) {
    var group = el.getAttribute("data-lightbox");
    groups[group] = groups[group] || [];
    var full = el.getAttribute("data-full") || el.querySelector("img").src;
    groups[group].push({ src: full, el: el });
    var myIndex = groups[group].length - 1;
    el.dataset.lbIndex = myIndex;
    el.addEventListener("click", function (e) {
      e.preventDefault();
      openLightbox(group, myIndex);
    });
  });

  var lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML =
    '<button class="lightbox-close" aria-label="Close"><svg class="icon"><use href="#i-close"></use></svg></button>' +
    '<button class="lightbox-nav prev" aria-label="Previous"><svg class="icon"><use href="#i-chevron-left"></use></svg></button>' +
    '<img alt="" />' +
    '<button class="lightbox-nav next" aria-label="Next"><svg class="icon"><use href="#i-chevron-right"></use></svg></button>' +
    '<div class="lightbox-count"></div>';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector("img");
  var lbCount = lb.querySelector(".lightbox-count");
  var curGroup = null, curIndex = 0;

  function openLightbox(group, index) {
    curGroup = group; curIndex = index;
    render();
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
  }
  function render() {
    var items = groups[curGroup];
    var item = items[curIndex];
    lbImg.src = item.src;
    lbCount.textContent = (curIndex + 1) + " / " + items.length;
  }
  function step(dir) {
    if (!curGroup) return;
    var items = groups[curGroup];
    curIndex = (curIndex + dir + items.length) % items.length;
    render();
  }
  lb.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  lb.querySelector(".prev").addEventListener("click", function () { step(-1); });
  lb.querySelector(".next").addEventListener("click", function () { step(1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
})();
