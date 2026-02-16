import { getTranslations } from "next-intl/server";
import { site } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("seoTitle"), description: t("seoDescription") };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: "fr" | "en" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return (
    <section
      className="container"
      style={{ paddingTop: "1.25rem", paddingBottom: "2rem" }}
    >
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>

      <div className="card" style={{ padding: "1rem" }}>
        <p>
          <strong>{t("phone")}:</strong>{" "}
          <a href={`tel:${site.telephone.replace(/\s/g, "")}`}>
            {site.telephone}
          </a>
        </p>
        <p style={{ marginTop: "0.75rem" }}>
          <strong>{t("address")}:</strong> {site.address.streetAddress},{" "}
          {site.address.postalCode} {site.address.addressLocality}
        </p>
      </div>

      <p style={{ marginTop: "1rem" }}>{t("formNote")}</p>
    </section>
  );
}
