// src/app/admin/users/page.tsx
import { getAdminUsers } from '../actions';
import { UsersClient } from './UsersClient';

export const metadata = { title: 'Users | Admin' };

interface Props {
  searchParams: Promise<{ role?: string; q?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const { role, q } = await searchParams;
  const users = await getAdminUsers(role, q);
  return <UsersClient users={users} activeRole={role ?? 'all'} initialSearch={q ?? ''} />;
}