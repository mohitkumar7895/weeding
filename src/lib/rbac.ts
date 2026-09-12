import { NextResponse } from 'next/server';
import { getSessionUser, TokenPayload } from './auth';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'FINANCE';

export interface RBACResult {
  ok: boolean;
  user?: TokenPayload;
  response?: NextResponse;
}

/**
 * Section 5: Admin Roles and Permissions Matrix
 * - SUPER_ADMIN: Full platform configuration, roles, system settings, finance visibility, audit and escalation.
 * - ADMIN: Operational management of customers, vendors, profiles, bookings, marketplace controls.
 * - SUPPORT: Support cases, reports, disputes, customer assistance. No financial or role-admin access.
 * - FINANCE: Commission, payouts, refunds, settlements, invoices and reconciliation. No unrelated system controls.
 */
export async function verifyAdminRole(allowedRoles: AdminRole[]): Promise<RBACResult> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: 'Authentication required. Please sign in to access administration console.' },
          { status: 401 }
        ),
      };
    }

    const userRole = user.role as AdminRole;
    if (!allowedRoles.includes(userRole)) {
      const roleLabels: Record<AdminRole, string> = {
        SUPER_ADMIN: 'Super Admin',
        ADMIN: 'Operations Admin',
        SUPPORT: 'Support Specialist',
        FINANCE: 'Finance Controller',
      };
      const requiredLabel = allowedRoles.map((r) => roleLabels[r] || r).join(' or ');
      const currentLabel = roleLabels[userRole] || userRole;

      return {
        ok: false,
        response: NextResponse.json(
          {
            success: false,
            message: `Protected Action: Requires ${requiredLabel} authorization. Your current role is ${currentLabel}.`,
            required_roles: allowedRoles,
            current_role: userRole,
          },
          { status: 403 }
        ),
      };
    }

    return { ok: true, user };
  } catch (error: any) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: error.message }, { status: 500 }),
    };
  }
}
