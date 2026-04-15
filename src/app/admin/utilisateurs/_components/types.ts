import type { Profile } from '@/types';
import type { AdminUserEntry } from '@/app/api/admin/users/route';

export interface UserWithActivity extends Profile {
  artisan_profile?: AdminUserEntry['artisan_profile'];
  _counts?: {
    messages: number;
    listings: number;
    forum_posts: number;
    service_requests: number;
  };
}
