'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Building2 } from 'lucide-react';
import type { AWSProfile } from '@alb-analyzer/db/schema';

interface ProfileSelectorProps {
  profiles: AWSProfile[];
}

export function ProfileSelector({ profiles }: ProfileSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleProfileChange = (profileName: string) => {
    const params = new URLSearchParams(searchParams);

    if (profileName) {
      params.set('profile', profileName);
    } else {
      params.delete('profile');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const currentProfile = searchParams.get('profile');
  const selectedProfile = currentProfile || '';

  return (
    <div className="border-b border-gray-800 p-4">
      <label className="block text-xs font-medium text-gray-400 mb-2">
        AWS Profile
      </label>
      <div className="relative">
        <select
          value={selectedProfile}
          onChange={(e) => handleProfileChange(e.target.value)}
          className="w-full appearance-none bg-gray-800 text-white rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-700"
        >
          <option value="">All Profiles</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.name}>
              {profile.displayName}
            </option>
          ))}
        </select>
        <Building2 className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
