export const site = {
  name: "Le p'tit mag",
  tagline: "Magasin associatif sans but lucratif – St-Romain (Ayent)",

  // format E.164 — Suisse
  telephone: "+41788664243",

  email: "info@leptitmag.org",

  address: {
    streetAddress: "Rue de l'Église 2",
    postalCode: "1966",
    addressLocality: "St-Romain (Ayent)",
    addressCountry: "CH",
    full: "Rue de l'Église 2, 1966 St-Romain (Ayent), Suisse",
  },

  openingHours: [
    {
      days: ["Wednesday"],
      ranges: ["09:00-12:00"],
    },
    {
      days: ["Friday"],
      ranges: ["09:00-12:00", "16:30-18:30"],
    },
    {
      days: ["Saturday"],
      ranges: ["09:00-12:00"],
    },
  ],

  // À compléter avec les vraies URLs Google Maps du local
  googleMapsEmbed: "",
  googleMapsLink: "",
};
