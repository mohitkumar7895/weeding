import { z } from 'zod';

export const AuthLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(['CUSTOMER', 'VENDOR']).optional(), // Some endpoints use this
});

export const AuthRegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters").max(64, "Password too long"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  role: z.enum(['CUSTOMER', 'VENDOR']),
});

export const AuthOtpVerifySchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be exactly 6 characters"),
});

export const PaymentVerifySchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID"),
  payment_reference: z.string().min(1, "Payment reference is required"),
});

export const DocumentUploadSchema = z.object({
  document_type: z.enum(['ID_PROOF', 'ADDRESS_PROOF', 'BUSINESS_LICENSE', 'OTHER']),
  file_name: z.string().min(1).max(255),
  file_size: z.number().max(5 * 1024 * 1024, "File size must be under 5MB"), // 5MB limit
  // Actual file content would be parsed by formidable/multer, but we validate metadata here
});
