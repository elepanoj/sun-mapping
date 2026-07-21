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
