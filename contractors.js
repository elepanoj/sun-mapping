// Contractor directory — one entry per contractor you send leads to.
//
// The object key ("code") is what goes into the QR code URL, so keep it
// short and URL-safe: lowercase letters, numbers, hyphens only.
//
// phone: E.164 format (+1 followed by the 10-digit number, no spaces/dashes)
//   so the tel: link works reliably on every phone.
// logo: path to an image file, relative to this file. Put logo files in
//   the logos/ folder. Recommended: square-ish PNG or SVG, transparent
//   background, at least 200x200px.

const CONTRACTORS = {
  'example-co': {
    name: 'Example Contracting Co.',
    phone: '+17575551234',
    phoneDisplay: '(757) 555-1234',
    logo: 'logos/example-co.svg',
  },
};
