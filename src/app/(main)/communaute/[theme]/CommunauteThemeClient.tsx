'use client';

import { useParams } from 'next/navigation';
import { getThemeConfig } from './_config';
import { useThemePageData } from './_hooks/useThemePageData';
import SqlMissingScreen from './_components/SqlMissingScreen';
import ThemeHeader from './_components/ThemeHeader';
import ThemeNav from './_components/ThemeNav';
import ThemeFeed from './_components/ThemeFeed';
import ThemeDiscussions from './_components/ThemeDiscussions';
import ThemeProfile from './_components/ThemeProfile';

export default function CommunauteThemePage() {
  const rawParams = useParams();
  const themeSlug =
    (Array.isArray(rawParams?.theme) ? rawParams.theme[0] : rawParams?.theme) ?? '';

  const themeConfig = getThemeConfig(themeSlug);

  const {
    profile,
    activeTab,
    setActiveTab,
    memberCount,
    filteredMembers,
    loading,
    loadError,
    search,
    setSearch,
    filterLevel,
    setFilterLevel,
    setRefreshKey,
    isMember,
    discussions,
    discLoading,
    discError,
    newMessage,
    setNewMessage,
    sendingMsg,
    discussEndRef,
    loadDiscussions,
    handleSendMessage,
    handleLike,
    handleJoined,
    handleLeft,
    handleLeftFromProfile,
  } = useThemePageData(themeSlug);

  // ── Early exit: SQL tables missing ────────────────────────────────────────
  if (loadError === 'sql_missing') {
    return <SqlMissingScreen themeHref={themeConfig.href} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <ThemeHeader
        themeSlug={themeSlug}
        themeConfig={themeConfig}
        memberCount={memberCount}
        loading={loading}
        userId={profile?.id}
        onJoined={handleJoined}
        onLeft={handleLeft}
      />

      {/* Sub-navigation */}
      <ThemeNav
        themeConfig={themeConfig}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        memberCount={memberCount}
        discussionCount={discussions.length}
        loading={loading}
        isLoggedIn={!!profile}
      />

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'membres' && (
          <ThemeFeed
            themeConfig={themeConfig}
            themeSlug={themeSlug}
            filteredMembers={filteredMembers}
            loading={loading}
            search={search}
            filterLevel={filterLevel}
            memberCount={memberCount}
            currentUserId={profile?.id}
            isLoggedIn={!!profile}
            onSearchChange={setSearch}
            onFilterLevelChange={setFilterLevel}
            onRefresh={() => setRefreshKey((k) => k + 1)}
            onTabChange={setActiveTab}
          />
        )}

        {activeTab === 'discussions' && (
          <ThemeDiscussions
            themeSlug={themeSlug}
            themeConfig={themeConfig}
            discussions={discussions}
            discLoading={discLoading}
            discError={discError}
            isMember={isMember}
            currentUserId={profile?.id}
            currentUserName={profile?.full_name ?? ''}
            currentUserAvatar={profile?.avatar_url}
            isLoggedIn={!!profile}
            newMessage={newMessage}
            sendingMsg={sendingMsg}
            discussEndRef={discussEndRef}
            onRefresh={loadDiscussions}
            onLike={handleLike}
            onMessageChange={setNewMessage}
            onSend={handleSendMessage}
            onJoined={handleJoined}
            onLeft={handleLeft}
          />
        )}

        {activeTab === 'monprofil' && (
          <ThemeProfile
            themeSlug={themeSlug}
            themeConfig={themeConfig}
            isLoggedIn={!!profile}
            userId={profile?.id}
            avatarUrl={profile?.avatar_url}
            fullName={profile?.full_name ?? ''}
            onJoined={handleJoined}
            onLeft={handleLeftFromProfile}
            onSaved={() => {
              setRefreshKey((k) => k + 1);
              setActiveTab('membres');
            }}
          />
        )}
      </div>
    </div>
  );
}
