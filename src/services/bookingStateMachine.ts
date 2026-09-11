export type BookingState =
  | 'DRAFT'
  | 'REQUESTED'
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUND_PROCESSING'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'RESOLVED';

const VALID_TRANSITIONS: Record<BookingState, BookingState[]> = {
  DRAFT: ['REQUESTED', 'PENDING', 'CANCELLED'],
  REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED'],
  PAYMENT_PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'DISPUTED'],
  IN_PROGRESS: ['COMPLETED', 'DISPUTED'],
  COMPLETED: ['DISPUTED'],
  CANCELLED: ['REFUND_PROCESSING', 'REFUNDED'],
  REFUND_PROCESSING: ['REFUNDED'],
  REFUNDED: [],
  REJECTED: [],
  DISPUTED: ['RESOLVED', 'REFUND_PROCESSING'],
  RESOLVED: ['COMPLETED', 'REFUNDED'],
};

export function isValidTransition(fromState: string, toState: string): boolean {
  const allowed = VALID_TRANSITIONS[fromState as BookingState];
  if (!allowed) return false;
  return allowed.includes(toState as BookingState);
}
