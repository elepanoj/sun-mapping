// Hero plug graphic: cord draws itself, a pulse travels it, the plug lights up.
(function () {
  const cord = document.getElementById("hero-cord");
  const pulse = document.getElementById("hero-pulse");
  const body = document.getElementById("hero-body");
  const prongs = [
    document.getElementById("hero-prong-live"),
    document.getElementById("hero-prong-signal"),
    document.getElementById("hero-prong-ground"),
  ].filter(Boolean);

  if (!cord || !pulse || !body) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const length = cord.getTotalLength();

  if (reduceMotion || typeof gsap === "undefined") {
    gsap && gsap.set([body, ...prongs], { opacity: 1 });
    if (typeof gsap === "undefined") {
      body.style.opacity = 1;
      prongs.forEach((p) => (p.style.opacity = 1));
    }
    pulse.style.opacity = 0;
    return;
  }

  cord.style.strokeDasharray = length;
  cord.style.strokeDashoffset = length;

  const dotPos = { t: 0 };

  const tl = gsap.timeline({ delay: 0.4 });

  tl.to(cord, {
    strokeDashoffset: 0,
    duration: 1.3,
    ease: "power2.out",
  }, 0);

  tl.to(pulse, { opacity: 1, duration: 0.2 }, 0);

  tl.to(dotPos, {
    t: 1,
    duration: 1.3,
    ease: "power2.out",
    onUpdate: () => {
      const pt = cord.getPointAtLength(dotPos.t * length);
      pulse.setAttribute("cx", pt.x);
      pulse.setAttribute("cy", pt.y);
    },
  }, 0);

  tl.to(pulse, { opacity: 0, duration: 0.25 }, 1.25);

  tl.to(body, { opacity: 1, duration: 0.4, ease: "power1.out" }, 1.1);

  tl.to(prongs, {
    opacity: 1,
    duration: 0.35,
    stagger: 0.12,
    ease: "power1.out",
    onComplete: () => {
      prongs.forEach((p) => p.classList.add("is-charged"));
    },
  }, 1.35);

  // Occasional ambient pulse traveling the cord again, subtle and slow.
  const loop = () => {
    const start = cord.getPointAtLength(0);
    pulse.setAttribute("cx", start.x);
    pulse.setAttribute("cy", start.y);
    gsap.to(dotPos, {
      t: 0,
      duration: 0,
    });
    gsap.to(pulse, { opacity: 1, duration: 0.3 });
    gsap.to(dotPos, {
      t: 1,
      duration: 1.6,
      ease: "power1.inOut",
      onUpdate: () => {
        const pt = cord.getPointAtLength(dotPos.t * length);
        pulse.setAttribute("cx", pt.x);
        pulse.setAttribute("cy", pt.y);
      },
      onComplete: () => {
        gsap.to(pulse, { opacity: 0, duration: 0.3 });
      },
    });
  };

  gsap.delayedCall(4, function repeatLoop() {
    loop();
    gsap.delayedCall(5, repeatLoop);
  });
})();
