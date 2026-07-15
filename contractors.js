// Runtime contractor directory, loaded from Supabase (see contractors.html to
// manage entries). Populated by loadContractors() before anything reads it.
// Shape matches the old hardcoded version so existing call sites didn't need
// to change: CONTRACTORS[code] = { name, phone, phoneDisplay, logo }.
let CONTRACTORS = {};

async function loadContractors() {
  const { data, error } = await supabaseClient.from('contractors').select('*');
  if (error) {
    console.error('Failed to load contractors:', error.message);
    return;
  }
  CONTRACTORS = {};
  (data || []).forEach(c => {
    CONTRACTORS[c.code] = {
      name: c.name,
      phone: c.phone,
      phoneDisplay: c.phone_display,
      logo: c.logo_url,
    };
  });
}
