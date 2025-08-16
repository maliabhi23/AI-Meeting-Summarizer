export function safeTrim(s) {
    return (s || "").toString().trim();
  }
  
  export function isEmailListValid(list) {
    const emails = (list || "").split(",").map(e => e.trim()).filter(Boolean);
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.length > 0 && emails.every(e => re.test(e));
  }
  
  export function nowISO() {
    return new Date().toISOString();
  }
  