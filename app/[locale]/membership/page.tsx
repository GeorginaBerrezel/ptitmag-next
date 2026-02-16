import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "membership" });
  return { title: t("seoTitle"), description: t("seoDescription") };
}

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "membership" });

  return (
    <section className="container" style={{ paddingTop: "1.25rem", paddingBottom: "2rem" }}>
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>

      <div className="card" style={{ padding: "1rem", marginTop: "1rem" }}>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: ".5rem" }}>
          <li>{t("regular")}</li>
          <li>{t("soft")}</li>
          <li>{t("don")}</li>
        </ul>
        <p style={{ marginTop: "1rem", marginBottom: 0 }}>{t("charges")}</p>
        <p style={{ marginTop: ".5rem", marginBottom: 0 }}>{t("payment")}</p>
      </div>

      <div className="card" style={{ padding: "1rem", marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("whyTitle")}</h2>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: ".5rem" }}>
          <li><strong>{t("why.sovereigntyTitle")}:</strong> {t("why.sovereigntyText")}</li>
          <li><strong>{t("why.shortCircuitsTitle")}:</strong> {t("why.shortCircuitsText")}</li>
          <li><strong>{t("why.ethicalTitle")}:</strong> {t("why.ethicalText")}</li>
          <li><strong>{t("why.wasteTitle")}:</strong> {t("why.wasteText")}</li>
          <li><strong>{t("why.fairPriceTitle")}:</strong> {t("why.fairPriceText")}</li>
          <li><strong>{t("why.transparencyTitle")}:</strong> {t("why.transparencyText")}</li>
          <li><strong>{t("why.participationTitle")}:</strong> {t("why.participationText")}</li>
          <li><strong>{t("why.communityTitle")}:</strong> {t("why.communityText")}</li>
        </ul>
      </div>
    </section>
  );
}
