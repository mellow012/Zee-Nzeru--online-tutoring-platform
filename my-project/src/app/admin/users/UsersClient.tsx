'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Search, Shield, UserCheck, GraduationCap, Star, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { toggleUserActiveAction } from '../actions';
import type { AdminUserRow } from '../actions';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_TABS = [
  { key: 'all',     label: 'All',      icon: null },
  { key: 'student', label: 'Students', icon: GraduationCap },
  { key: 'tutor',   label: 'Tutors',   icon: UserCheck },
  { key: 'admin',   label: 'Admins',   icon: Shield },
];

interface Props {
  users: AdminUserRow[];
  activeRole: string;
  initialSearch: string;
}

export function UsersClient({ users, activeRole, initialSearch }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = (role: string, q: string) => {
    const params = new URLSearchParams();
    if (role !== 'all') params.set('role', role);
    if (q) params.set('q', q);
    startTransition(() => {
      router.push(`/admin/users${params.toString() ? `?${params}` : ''}`);
    });
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => navigate(activeRole, v), 400);
  };

  const handleToggle = async (userId: string, currentlyActive: boolean) => {
    setTogglingId(userId);
    const result = await toggleUserActiveAction(userId, !currentlyActive);
    setTogglingId(null);
    if (result.success) {
      toast({ title: currentlyActive ? 'User suspended.' : 'User reactivated.' });
      startTransition(() => router.refresh());
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} users</p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 bg-white border-gray-200"
          />
        </div>

        {/* Role tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {ROLE_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => navigate(key, search)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeRole === key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>

        {/* Users table */}
        {users.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">No users found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const isToggling = togglingId === u.userId;
              return (
                <Card key={u.userId} className="shadow-sm border-0">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={u.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-medium text-sm">
                        {getInitials(u.fullName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{u.fullName}</p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 capitalize ${
                            u.role === 'admin'   ? 'text-purple-700 bg-purple-50 border-purple-200' :
                            u.role === 'tutor'   ? 'text-blue-700 bg-blue-50 border-blue-200' :
                            'text-gray-600 bg-gray-50 border-gray-200'
                          }`}
                        >
                          {u.role}
                        </Badge>
                        {u.role === 'tutor' && u.tutorVerified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 ${
                            u.isActive
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : 'text-red-700 bg-red-50 border-red-200'
                          }`}
                        >
                          {u.isActive ? 'active' : 'suspended'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          Joined {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                        </p>
                        {u.role === 'tutor' && u.tutorRating !== undefined && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {(u.tutorRating ?? 0).toFixed(1)}
                            {' · '}{u.totalSessions ?? 0} sessions
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {u.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-8 text-xs ${
                            u.isActive
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                          onClick={() => handleToggle(u.userId, u.isActive)}
                          disabled={isToggling}
                        >
                          {isToggling ? '…' : u.isActive ? 'Suspend' : 'Reactivate'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}