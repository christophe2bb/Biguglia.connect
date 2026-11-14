import { expect, test } from "@playwright/test";

// This suite validates the actual interface with an unavailable data service.
// It deliberately uses a synthetic 503 response, never writes to the real base,
// and does not claim to validate real multi-account transactions.
test.beforeEach(async ({ page }) => {
  await page.route(
    "https://qmrkacrpncdkhofiqlrg.supabase.co/rest/v1/**",
    (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Synthetic service outage for interface verification",
        }),
      }),
  );
});
test("home renders, stays usable and reports a data outage", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "La vie d’ici, plus proche." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Réessayer", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page
    .getByRole("link", {
      name: "Déposer une demande Un projet, un besoin, une solution",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Retrouvons-nous ici" }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Se connecter", exact: true })
    .click();
  await expect(page).toHaveURL(/connexion\?next=%2Fdemandes%2Fnouveau/);
  await expect(
    page.getByRole("heading", { name: "Heureux de vous retrouver." }),
  ).toBeVisible();
});
const routes = [
  ["artisans", "Artisans"],
  ["annonces", "Petites annonces"],
  ["materiel", "Prêt de matériel"],
  ["collectionneurs", "Collectionneurs"],
  ["perdu-trouve", "Perdu / Trouvé"],
  ["emploi/offres", "Offres d’emploi"],
  ["emploi/demandes", "Recherche d’emploi"],
  ["evenements", "Événements"],
  ["promenades", "Promenades"],
  ["sorties", "Sorties en groupe"],
  ["associations", "Associations"],
  ["coups-de-main", "Coups de main"],
  ["forum", "Forum des habitants"],
];
for (const [route, title] of routes)
  test(`${route} has a usable page and visible error recovery`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/" + route);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("main")
        .getByRole("button", { name: "Réessayer", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  });
test("private areas are protected before any data is fetched", async ({
  page,
}) => {
  for (const route of [
    "messages",
    "dashboard",
    "dashboard/avis",
    "profil",
    "favoris",
    "notifications",
    "demandes",
  ]) {
    await page.goto("/" + route);
    await expect(
      page.getByRole("heading", { name: "Retrouvons-nous ici" }),
    ).toBeVisible();
  }
});
test("signup requires confirmation and consent", async ({ page }) => {
  await page.goto("/inscription");
  await expect(
    page.getByRole("heading", { name: "Rejoignez la vie d’ici." }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Confirmez le mot de passe", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page
    .getByRole("button", { name: "Créer mon compte", exact: true })
    .click();
  await expect(page).toHaveURL(/inscription/);
  expect(
    await page
      .getByLabel("Votre nom", { exact: true })
      .evaluate((el: HTMLInputElement) => el.validity.valueMissing),
  ).toBe(true);
});
