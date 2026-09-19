export type BookingState =
  | 'DRAFT'
  | 'REQUESTED'
  | 'PENDING' // Added as alias for UI or specific logic if needed
  | 'PENDING_VENDOR'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUND_PROCESSING'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'RESOLVED';

export type UserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN' | 'SUPER_ADMIN';

// Define valid transitions strictly based on role.
const ROLE_BASED_TRANSITIONS: Record<UserRole, Partial<Record<BookingState, BookingState[]>>> = {
  CUSTOMER: {
    REQUESTED: ['CANCELLED'], // Customer can cancel their request before vendor accepts
    PENDING_VENDOR: ['CANCELLED'],
    ACCEPTED: ['PAYMENT_PENDING', 'CANCELLED'],
    PAYMENT_PENDING: ['CANCELLED'],
    // Customer cannot cancel directly once CONFIRMED without going through dispute/support in this setup, or we allow it but with penalties.
    // Let's allow cancellation but backend will handle refund logic later.
    CONFIRMED: ['CANCELLED', 'DISPUTED'],
    IN_PROGRESS: ['DISPUTED'],
    COMPLETED: ['DISPUTED'],
  },
  VENDOR: {
    REQUESTED: ['ACCEPTED', 'REJECTED'],
    PENDING_VENDOR: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: ['REJECTED'], // Vendor can reject before payment
    // Vendor cannot easily cancel a CONFIRMED booking without penalty, but system allows the state change
    CONFIRMED: ['CANCELLED', 'IN_PROGRESS'], 
    IN_PROGRESS: ['COMPLETED'],
  },
  ADMIN: {
    DRAFT: ['REQUESTED', 'PENDING', 'CANCELLED'],
    REQUESTED: ['ACCEPTED', 'CONFIRMED', 'REJECTED', 'CANCELLED'],
    PENDING_VENDOR: ['ACCEPTED', 'CONFIRMED', 'REJECTED', 'CANCELLED'],
    ACCEPTED: ['PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED'],
    PAYMENT_PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'DISPUTED'],
    COMPLETED: ['DISPUTED'],
    CANCELLED: ['REFUND_PROCESSING', 'REFUND_PENDING', 'REFUNDED'],
    REFUND_PENDING: ['REFUND_PROCESSING', 'REFUNDED'],
    REFUND_PROCESSING: ['REFUNDED'],
    REFUNDED: [],
    REJECTED: [],
    DISPUTED: ['RESOLVED', 'REFUND_PROCESSING', 'COMPLETED', 'CANCELLED'],
    RESOLVED: ['COMPLETED', 'REFUNDED', 'CANCELLED'],
  },
  SUPER_ADMIN: {} // Handled dynamically below (Admin copy)
};

// Copy Admin permissions to Super Admin
ROLE_BASED_TRANSITIONS.SUPER_ADMIN = ROLE_BASED_TRANSITIONS.ADMIN;

/**
 * Validates if a state transition is allowed for a given user role.
 */
export function isValidTransition(fromState: string, toState: string, userRole: UserRole): boolean {
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    // Admins have broad access defined in the map, but technically they can force override in the route anyway.
    const allowedForAdmin = ROLE_BASED_TRANSITIONS.ADMIN[fromState as BookingState];
    return allowedForAdmin ? allowedForAdmin.includes(toState as BookingState) : false;
  }

  const roleTransitions = ROLE_BASED_TRANSITIONS[userRole];
  if (!roleTransitions) return false;

  const allowed = roleTransitions[fromState as BookingState];
  if (!allowed) return false;

  return allowed.includes(toState as BookingState);
}

/**
 * Returns a list of permitted next states for the UI to render action buttons.
 */
export function getPermittedNextStates(currentState: string, userRole: UserRole): BookingState[] {
  const roleTransitions = ROLE_BASED_TRANSITIONS[userRole];
  if (!roleTransitions) return [];
  
  return roleTransitions[currentState as BookingState] || [];
}
