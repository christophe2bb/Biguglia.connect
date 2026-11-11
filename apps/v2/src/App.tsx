import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { MODULES } from "./lib/modules";
import Shell from "./components/Shell";
import NativeBridge from "./components/NativeBridge";
import { ErrorBoundary, Loading, NotFound } from "./components/ui";
import Home, { Explore } from "./pages/Home";
import { RecordDetail, RecordForm, RecordList } from "./pages/Records";
const Auth = lazy(() => import("./pages/Auth"));
const Messages = lazy(() => import("./pages/Messages"));
const Admin = lazy(() => import("./pages/Admin"));
const Info = lazy(() => import("./pages/Info"));
const Profile = lazy(() =>
  import("./pages/Account").then((m) => ({ default: m.Profile })),
);
const Dashboard = lazy(() =>
  import("./pages/Account").then((m) => ({ default: m.Dashboard })),
);
const Notifications = lazy(() =>
  import("./pages/Account").then((m) => ({ default: m.Notifications })),
);
const Favorites = lazy(() =>
  import("./pages/Account").then((m) => ({ default: m.Favorites })),
);
const Community = lazy(() =>
  import("./pages/Community").then((m) => ({ default: m.Community })),
);
const CommunityTheme = lazy(() =>
  import("./pages/Community").then((m) => ({ default: m.CommunityTheme })),
);
const SearchPage = lazy(() =>
  import("./pages/Community").then((m) => ({ default: m.SearchPage })),
);
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <NativeBridge />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<Shell />}>
                <Route index element={<Home />} />
                <Route path="explorer" element={<Explore />} />
                <Route path="publier" element={<Explore publish />} />
                <Route path="connexion" element={<Auth />} />
                <Route path="inscription" element={<Auth mode="signup" />} />
                <Route path="mot-de-passe" element={<Auth mode="password" />} />
                <Route
                  path="auth/callback"
                  element={<Auth mode="callback" />}
                />
                <Route
                  path="auth/reset-password"
                  element={<Navigate to="/mot-de-passe?recovery=1" replace />}
                />
                <Route
                  path="artisans/demande"
                  element={<Navigate to="/demandes/nouveau" replace />}
                />
                <Route
                  path="emploi"
                  element={<Navigate to="/emploi/offres" replace />}
                />
                {MODULES.flatMap((m) => [
                  <Route
                    key={m.slug}
                    path={m.slug}
                    element={<RecordList key={m.slug} module={m} />}
                  />,
                  <Route
                    key={m.slug + "-create"}
                    path={m.slug + "/nouveau"}
                    element={<RecordForm key={m.slug + "-new"} module={m} />}
                  />,
                  <Route
                    key={m.slug + "-edit"}
                    path={m.slug + "/:id/modifier"}
                    element={
                      <RecordForm key={m.slug + "-edit"} module={m} editing />
                    }
                  />,
                  <Route
                    key={m.slug + "-detail"}
                    path={m.slug + "/:id"}
                    element={<RecordDetail key={m.slug} module={m} />}
                  />,
                ])}
                <Route path="messages" element={<Messages />} />
                <Route path="messages/:id" element={<Messages />} />
                <Route path="profil" element={<Profile />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="favoris" element={<Favorites />} />
                <Route path="communaute" element={<Community />} />
                <Route path="communaute/:theme" element={<CommunityTheme />} />
                <Route path="recherche" element={<SearchPage />} />
                <Route path="admin" element={<Admin />} />
                {[
                  "aide",
                  "regles",
                  "confiance",
                  "confidentialite",
                  "mentions-legales",
                  "cgu",
                ].map((kind) => (
                  <Route
                    key={kind}
                    path={kind}
                    element={<Info kind={kind} />}
                  />
                ))}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
