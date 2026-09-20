import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { homePathForRole, isCustomerRole } from '@/lib/roleHome';

export default async function ProfileRedirectPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  if (isCustomerRole(user.role)) {
    redirect('/dashboard?tab=profile');
  }
  redirect(homePathForRole(user.role));
}
