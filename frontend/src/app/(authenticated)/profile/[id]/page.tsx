'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  ArrowLeft,
  MessageSquare,
  UserPlus,
  Settings,
  EyeOff
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  last_login?: string;
  privacy_settings: {
    searchable: boolean;
    show_profile_stats: boolean;
    show_email: boolean;
    show_full_name: boolean;
  };
  profile_stats?: {
    total_transactions?: number;
    total_deposits?: number;
    total_withdrawals?: number;
    member_since_days?: number;
  };
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params.id as string;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isContact, _setIsContact] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      // Mock data - replace with actual API call when user profile service is available
      const userLookup: Record<string, { id: number; username: string; first_name: string; last_name: string }> = {
        '1': { id: 1, username: 'john_doe', first_name: 'John', last_name: 'Doe' },
        'john_doe': { id: 1, username: 'john_doe', first_name: 'John', last_name: 'Doe' },
        '2': { id: 2, username: 'jane_smith', first_name: 'Jane', last_name: 'Smith' },
        'jane_smith': { id: 2, username: 'jane_smith', first_name: 'Jane', last_name: 'Smith' },
        '3': { id: 3, username: 'mike_wilson', first_name: 'Mike', last_name: 'Wilson' },
        'mike_wilson': { id: 3, username: 'mike_wilson', first_name: 'Mike', last_name: 'Wilson' },
        '4': { id: 4, username: 'david_brown', first_name: 'David', last_name: 'Brown' },
        'david_brown': { id: 4, username: 'david_brown', first_name: 'David', last_name: 'Brown' },
      };
      const userData = userLookup[userId] || {
        id: parseInt(userId) || 0,
        username: userId,
        first_name: userId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).split(' ')[0] || 'User',
        last_name: userId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).split(' ').slice(1).join(' ') || '',
      };
      const mockProfile: UserProfile = {
        id: userData.id,
        username: userData.username,
        email: 'user@example.com',
        first_name: userData.first_name,
        last_name: userData.last_name,
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        last_login: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        privacy_settings: {
          searchable: true,
          show_profile_stats: true,
          show_email: false,
          show_full_name: true
        },
        profile_stats: {
          total_transactions: 156,
          total_deposits: 45,
          total_withdrawals: 111,
          member_since_days: 90
        }
      };
      
      setProfile(mockProfile);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-[var(--glass-bg)] rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-[var(--glass-bg)] rounded mb-4"></div>
          <div className="h-48 bg-[var(--glass-bg)] rounded"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="text-center py-12">
          <User className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Profile Not Found</h2>
          <p className="text-[var(--text-secondary)] mb-4">The user profile you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const showEmail = isOwnProfile || profile.privacy_settings.show_email;
  const showFullName = isOwnProfile || profile.privacy_settings.show_full_name;
  const showStats = isOwnProfile || profile.privacy_settings.show_profile_stats;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">User Profile</h1>
        </div>
        {isOwnProfile && (
          <Button
            onClick={() => router.push('/settings')}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-[var(--primary-blue)] rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                {showFullName 
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile.username
                }
              </h2>
              <p className="text-[var(--text-secondary)]">@{profile.username}</p>
              {profile.last_login && (
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  Last seen {formatDistanceToNow(new Date(profile.last_login), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
          {!isOwnProfile && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/messages?user=${profile.username}`)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
              {!isContact && (
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Contact Information</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">
              {showEmail ? profile.email : '••••••••@•••••.com'}
            </span>
            {!showEmail && (
              <div className="flex items-center gap-1 text-sm text-[var(--text-tertiary)]">
                <EyeOff className="w-3 h-3" />
                <span>Hidden</span>
              </div>
            )}
          </div>
          {profile.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-[var(--text-tertiary)]" />
              <span className="text-[var(--text-secondary)]">{profile.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      {showStats && profile.profile_stats && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Activity Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--primary-blue)]">
                {profile.profile_stats.total_transactions || 0}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Total Transactions</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--primary-emerald)]">
                {profile.profile_stats.total_deposits || 0}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Deposits</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--primary-amber)]">
                {profile.profile_stats.total_withdrawals || 0}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Withdrawals</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--primary-indigo)]">
                {profile.profile_stats.member_since_days || 0}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Days Active</p>
            </div>
          </div>
        </Card>
      )}

      {/* Privacy Notice */}
      {!showStats && !isOwnProfile && (
        <Card className="p-6 text-center">
          <Shield className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]">
            This user has chosen to keep their activity statistics private.
          </p>
        </Card>
      )}
    </div>
  );
}