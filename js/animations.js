// Scroll-driven motion: reveal-on-scroll, headline split, the scroll spine,
// and the pinned horizontal "Three Prongs" showcase.
(function () {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---- Split the hero headline into words for a line-by-line reveal ---- */
  document.querySelectorAll("[data-split]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((word, i) => {
      const wrap = document.createElement("span");
      wrap.className = "split-word";
      wrap.style.setProperty("--i", i);
      const inner = document.createElement("span");
      inner.textContent = word;
      wrap.appendChild(inner);
      el.appendChild(wrap);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });

  /* ---- Stagger index for grouped reveal elements (reveal-up + flicker-in share a sequence) ---- */
  document.querySelectorAll(".reveal-up, .flicker-in").forEach((el) => {
    const siblings = Array.from(el.parentElement.children).filter(
      (c) => c.classList.contains("reveal-up") || c.classList.contains("flicker-in")
    );
    el.style.setProperty("--i", siblings.indexOf(el));
  });

  /* ---- Reveal on scroll (IntersectionObserver — no GSAP dependency) ---- */
  const revealTargets = document.querySelectorAll(
    ".reveal-up, .flicker-in, [data-split]"
  );

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach((el) => io.observe(el));
  }

  if (typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---- Scroll spine: progress dot + section color ---- */
  const spineDot = document.querySelector(".spine__dot");
  if (spineDot && window.matchMedia("(min-width: 900px)").matches) {
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        spineDot.style.top = self.progress * 100 + "%";
      },
    });

    const zones = [
      { selector: "#build", color: "var(--live)" },
      { selector: "#automate", color: "var(--signal)" },
      { selector: "#scale", color: "var(--ground)" },
    ];
    zones.forEach((zone) => {
      const target = document.querySelector(zone.selector);
      if (!target) return;
      ScrollTrigger.create({
        trigger: target,
        start: "top center",
        onEnter: () =>
          document.documentElement.style.setProperty(
            "--spine-color",
            zone.color
          ),
        onEnterBack: () =>
          document.documentElement.style.setProperty(
            "--spine-color",
            zone.color
          ),
      });
    });
  }

  /* ---- Pinned horizontal "Three Prongs" showcase (desktop only) ---- */
  if (!reduceMotion) {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      const track = document.querySelector(".prongs__track");
      const viewport = document.querySelector(".prongs__viewport");
      if (!track || !viewport) return;

      const getDistance = () => track.scrollWidth - viewport.clientWidth;

      const tween = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: ".prongs",
          start: "top top",
          end: () => "+=" + getDistance(),
          scrub: 1,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      return () => tween.scrollTrigger && tween.scrollTrigger.kill();
    });
  }
})();
