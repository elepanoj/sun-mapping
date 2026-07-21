// Nav, mobile menu, and contact form handling.
(function () {
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav__toggle");
  const mobileLinks = document.querySelectorAll(".nav__mobile a");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
    mobileLinks.forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Cursor glow + magnetic buttons — desktop pointer only, and only if motion is welcome.
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (canHover && !reduceMotion) {
    const glow = document.querySelector(".cursor-glow");
    if (glow) {
      const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const target = { x: pos.x, y: pos.y };
      let raf = null;

      const tick = () => {
        pos.x += (target.x - pos.x) * 0.16;
        pos.y += (target.y - pos.y) * 0.16;
        glow.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        raf = requestAnimationFrame(tick);
      };

      window.addEventListener("mousemove", (e) => {
        target.x = e.clientX;
        target.y = e.clientY;
        glow.classList.add("is-active");
        if (!raf) raf = requestAnimationFrame(tick);
      });
      document.addEventListener("mouseleave", () => glow.classList.remove("is-active"));
    }

    document.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "";
      });
    });
  }

  // Contact form — no backend wired up yet, so we hand off to mailto.
  const form = document.getElementById("contact-form");
  const note = document.getElementById("form-note");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = new FormData(form);
      const name = data.get("name");
      const email = data.get("email");
      const projectType = data.get("project_type");
      const message = data.get("message");

      const subject = `New project inquiry — ${projectType}`;
      const body =
        `Name: ${name}\n` +
        `Email: ${email}\n` +
        `Project type: ${projectType}\n\n` +
        `${message}`;

      const mailto = `mailto:hello@3prongmedia.com?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;

      if (note) {
        note.textContent = "Opening your email client to send this along…";
      }
      window.location.href = mailto;
    });
  }
})();
