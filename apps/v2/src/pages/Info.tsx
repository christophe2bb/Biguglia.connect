import { Link } from "react-router-dom";
import {
  ArrowRight,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { PageHeading } from "../components/ui";
const help = [
  [
    "Comment publier ?",
    "Choisissez « Publier », puis une rubrique. Décrivez votre projet et validez le formulaire. Vos publications se retrouvent dans « Mes activités ».",
  ],
  [
    "Comment contacter un habitant ?",
    "Ouvrez une publication et choisissez « Contacter ». La conversation se poursuit dans votre messagerie privée.",
  ],
  [
    "Comment trouver un artisan ?",
    "Ouvrez la rubrique Artisans. Filtrez par métier, consultez le profil et écrivez à l’artisan pour préciser votre projet.",
  ],
  [
    "Comment emprunter du matériel ?",
    "Choisissez un matériel disponible, indiquez vos dates et envoyez une demande. Son propriétaire peut accepter ou refuser depuis ses activités. Convenez ensemble des modalités du prêt.",
  ],
  [
    "Comment signaler un problème ?",
    "Depuis la publication concernée, utilisez l’icône de signalement. Choisissez un motif et précisez ce qui vous inquiète. L’équipe de modération reçoit votre signalement.",
  ],
  [
    "J’ai oublié mon mot de passe.",
    "Utilisez « Mot de passe oublié » sur la page de connexion. Consultez votre boîte de réception et vos courriers indésirables.",
  ],
  [
    "Puis-je utiliser mon compte existant ?",
    "Oui. Votre adresse e-mail, votre mot de passe et les données de votre compte sont conservés.",
  ],
];
export default function Info({ kind }: { kind: string }) {
  const title =
    kind === "aide"
      ? "Un coup de main ?"
      : kind === "confidentialite"
        ? "Votre vie privée compte."
        : kind === "mentions-legales"
          ? "Mentions légales"
          : kind === "cgu"
            ? "Conditions d’utilisation"
            : kind === "confiance"
              ? "La confiance se construit ensemble."
              : "Les règles du bien vivre ensemble.";
  return (
    <div className="info-page">
      <PageHeading eyebrow="Biguglia Connect" title={title} />
      {kind === "aide" ? (
        <>
          {help.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
          <Link to="/mot-de-passe" className="button secondary">
            Retrouver mon accès
            <ArrowRight size={17} />
          </Link>
        </>
      ) : kind === "confidentialite" ? (
        <>
          <section>
            <LockKeyhole size={29} />
            <h2>Les données utiles à votre compte</h2>
            <p>
              Biguglia Connect utilise votre adresse e-mail pour la connexion,
              votre nom affiché et les informations que vous choisissez de
              renseigner. Le téléphone et le quartier sont facultatifs.
            </p>
            <p>
              Les publications que vous rendez publiques peuvent être consultées
              par les visiteurs. Les messages et les demandes adressées à un
              artisan sont réservés aux personnes autorisées.
            </p>
          </section>
          <section>
            <h2>Hébergement et fonctionnement</h2>
            <p>
              Le site est hébergé par Vercel. Les comptes, les publications et
              les fichiers sont stockés par Supabase, sur le projet existant en
              Europe. La nouvelle application ne comporte ni publicité, ni suivi
              publicitaire.
            </p>
            <p>
              La session de connexion est conservée sur votre appareil pour vous
              permettre de revenir sans ressaisir votre mot de passe. Les
              préférences nécessaires au fonctionnement restent sur votre
              appareil.
            </p>
          </section>
          <section>
            <h2>Votre maîtrise des informations</h2>
            <p>
              Vous pouvez modifier vos informations dans votre profil,
              télécharger vos informations de profil et gérer vos publications
              depuis vos activités.
            </p>
            <Link to="/profil" className="button secondary">
              Gérer mon profil
              <ArrowRight size={17} />
            </Link>
          </section>
        </>
      ) : kind === "mentions-legales" ? (
        <>
          <section>
            <h2>Biguglia Connect</h2>
            <p>
              Plateforme locale de mise en relation à Biguglia, Haute-Corse,
              France.
            </p>
            <p>
              La plateforme facilite les échanges entre habitants, associations
              et professionnels. Les prestations et les transactions sont
              convenues directement entre les participants.
            </p>
          </section>
          <section>
            <h2>Hébergeurs</h2>
            <p>
              Application web : Vercel Inc. ·{" "}
              <a
                href="https://vercel.com/legal"
                target="_blank"
                rel="noreferrer"
              >
                Informations légales Vercel
              </a>
            </p>
            <p>
              Données et authentification : Supabase ·{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noreferrer"
              >
                Politique de confidentialité Supabase
              </a>
            </p>
          </section>
          <section>
            <h2>Contenus</h2>
            <p>
              Les membres restent responsables des contenus qu’ils publient. Un
              contenu problématique peut être signalé à la modération depuis sa
              publication.
            </p>
          </section>
        </>
      ) : (
        <>
          <section>
            <HeartHandshake size={32} />
            <h2>Du respect dans chaque échange</h2>
            <p>
              Présentez-vous honnêtement, décrivez votre besoin avec précision
              et gardez un ton respectueux. Les insultes, la discrimination, le
              harcèlement et les publications trompeuses n’ont pas leur place
              ici.
            </p>
          </section>
          <section>
            <ShieldCheck size={30} />
            <h2>Des rencontres en confiance</h2>
            <p>
              Échangez d’abord dans la messagerie. Vérifiez les informations
              nécessaires avant de confier une prestation ou de prêter un objet.
              Privilégiez un rendez-vous dans un lieu adapté et ne communiquez
              jamais vos mots de passe ou vos codes bancaires.
            </p>
            <p>
              La mention « Artisan vérifié » signale une vérification du profil
              par la modération. Elle ne remplace pas les vérifications et les
              garanties propres à la prestation.
            </p>
          </section>
          <section>
            <h2>Des publications claires et légitimes</h2>
            <p>
              Publiez uniquement des contenus que vous avez le droit de
              partager. Précisez les prix, l’état des objets, les modalités de
              prêt ou les conditions de participation. Les contenus illicites,
              les arnaques et la publicité indésirable peuvent être retirés.
            </p>
          </section>
          <section>
            <h2>Signaler et se protéger</h2>
            <p>
              Utilisez le signalement depuis une publication si un contenu vous
              semble problématique. Conservez les éléments utiles et cessez
              l’échange en cas de doute.
            </p>
            <Link className="text-button" to="/aide">
              Consulter l’aide
              <ArrowRight size={17} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
