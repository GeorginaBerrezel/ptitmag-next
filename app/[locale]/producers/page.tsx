import { getTranslations } from "next-intl/server";

export default async function ProducersPage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "producers" });

  const localProducers = [
    "La Fermette à Didi - Icôgne",
    "Bioterroir - Bramois",
    "Les Dailles - St-Léonard",
    "Domaine de la Préfecture - Vétroz",
    "Grégory Sermier - Arbaz",
    "Brasseries d’Ayent - Ayent",
    "Chèrouche - Ayent",
    "Oliv et Stéph - En là",
    "Graines d’Avenir - Montana",
    "La Cave à levain - Champlan",
    "Vérène Melchior - Savièse",
    "Evoleina Rhodiola - Outre",
  ];

  const wholesalers = [
    "Biopartner",
    "Aromacos",
    "Bio-pass",
    "Novoma",
    "Kingnature",
    "Groen Labo",
    "Phytolis",
    "Laboratoires LRK",
    "Algorigin",
  ];

  return (
    <section className="container" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
      <h1>{t("title")}</h1>
      <p style={{ marginBottom: "2rem" }}>{t("intro")}</p>

      <h2>{t("local_title")}</h2>
      <ul>
        {localProducers.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <h2 style={{ marginTop: "2rem" }}>{t("wholesale_title")}</h2>
      <ul>
        {wholesalers.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </section>
  );
}
