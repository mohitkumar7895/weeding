'use client';

import React from 'react';
import LegalPageLayout, { LegalSection } from '@/components/LegalPageLayout';

export default function PaymentRefundPage() {
  const sections: LegalSection[] = [
    {
      id: 'introduction',
      number: 1,
      title: 'Introduction',
      content: (
        <>
          <p>
            This Payment and Refund Policy explains the general conditions governing payments, booking cancellations, refunds, and payment-related enquiries on the WedWithMe platform operated by WedWithMe Platform Private Limited (“WedWithMe”, “Company”, “we”, “us”, or “our”).
          </p>
          <p>
            The policy applies to transactions made through payment facilities offered on the platform, where available. Specific terms displayed during checkout, vendor booking conditions, and applicable laws may also apply to a particular transaction.
          </p>
        </>
      ),
    },
    {
      id: 'payment-methods',
      number: 2,
      title: 'Available Payment Methods',
      content: (
        <>
          <p>
            WedWithMe may support payment methods such as credit cards, debit cards, UPI, net banking, digital wallets, or other payment methods made available through authorised payment service providers.
          </p>
          <p>
            Available methods may vary depending on the transaction, payment partner, user location, and technical availability. Users must follow the payment instructions displayed during checkout and ensure that payment information is entered accurately.
          </p>
        </>
      ),
    },
    {
      id: 'payment-processing',
      number: 3,
      title: 'Payment Processing',
      content: (
        <>
          <p>
            Payments may be processed by third-party payment gateways, banks, or other authorised payment service providers. WedWithMe may receive transaction references, payment status, amounts, timestamps, and other information necessary to confirm and manage transactions.
          </p>
          <p>
            WedWithMe does not intend to store complete card security credentials where payment processing is handled by authorised third-party providers. Payment transactions may be subject to the terms, security procedures, and verification requirements of the relevant provider.
          </p>
        </>
      ),
    },
    {
      id: 'booking-payments-charges',
      number: 4,
      title: 'Booking Payments and Vendor Charges',
      content: (
        <>
          <p>
            Depending on the service, a customer may be required to pay a booking amount, advance, deposit, platform fee, or the full service price. The applicable amount and payment schedule should be displayed or communicated before the transaction is completed.
          </p>
          <p>
            Customers should verify the service details, event date, vendor identity, applicable taxes, additional charges, cancellation conditions, and refund terms before making payment. Vendors are responsible for accurately communicating the service commitments and charges applicable to their bookings.
          </p>
        </>
      ),
    },
    {
      id: 'confirmation-failed-transactions',
      number: 5,
      title: 'Payment Confirmation and Failed Transactions',
      content: (
        <>
          <p>
            A payment will be treated as successful only when its status has been confirmed through the applicable payment system or booking process. A delayed confirmation, bank response, or temporary technical issue does not necessarily mean that a payment has failed or succeeded.
          </p>
          <p>
            If an amount has been debited but the booking or payment status remains pending, users should retain the transaction reference and contact the relevant support channel. Where a transaction is confirmed as failed but funds were debited, any applicable reversal or refund will be handled through the payment provider and relevant banking processes.
          </p>
        </>
      ),
    },
    {
      id: 'cancellation-policy',
      number: 6,
      title: 'Cancellation Policy',
      content: (
        <>
          <p>
            Cancellation eligibility depends on the service purchased, the vendor&apos;s disclosed booking conditions, the time remaining before the scheduled event, and any applicable platform-specific rules.
          </p>
          <p>
            Customers should review the cancellation conditions before confirming a booking. Where a booking is directly between a customer and an independent vendor, the vendor&apos;s agreed cancellation terms may apply, subject to applicable law and any overriding commitments made by WedWithMe.
          </p>
          <p>
            Users should submit cancellation requests through the available booking interface or official support channel and provide the booking reference and relevant details.
          </p>
        </>
      ),
    },
    {
      id: 'refund-eligibility',
      number: 7,
      title: 'Refund Eligibility',
      content: (
        <>
          <p>
            Refunds may be considered where a payment was duplicated, a transaction failed despite a debit, a booking was cancelled under applicable cancellation terms, a service was not provided as agreed, or another circumstance qualifies under the relevant booking conditions or applicable law.
          </p>
          <p>
            Refunds are not automatically guaranteed for every cancellation or change of plan. Eligibility and any permitted deductions will be determined according to the disclosed transaction terms, the circumstances of the request, and applicable legal requirements.
          </p>
          <div className="highlight-box">
            <strong>Consumer Protection:</strong> Nothing in this policy is intended to remove any consumer right or refund entitlement that cannot lawfully be excluded under Indian Consumer Protection laws.
          </div>
        </>
      ),
    },
    {
      id: 'refund-request-process',
      number: 8,
      title: 'Refund Request Process',
      content: (
        <>
          <p>
            Users requesting a refund should contact the official support channel and provide their name, registered contact details, booking reference, transaction ID, payment date, amount paid, reason for the request, and supporting information where reasonably necessary.
          </p>
          <p>
            WedWithMe may request additional details to verify the transaction and assess eligibility.
          </p>
          <div className="important-box">
            <strong>Security Reminder:</strong> Users should never share passwords, UPI PINs, card PINs, or one-time passwords (OTPs) when requesting support or refund verification. Our team will never ask for your PIN or OTP.
          </div>
        </>
      ),
    },
    {
      id: 'refund-processing-time',
      number: 9,
      title: 'Refund Processing Time',
      content: (
        <>
          <p>
            Once a refund is approved, the time required for the amount to appear in the user&apos;s account may depend on the payment gateway, bank, card issuer, or original payment method.
          </p>
          <p>
            Any estimated processing period communicated during the refund process should be treated as an estimate unless expressly confirmed otherwise. If a refund does not appear within the communicated period, users may contact support with the original transaction reference.
          </p>
        </>
      ),
    },
    {
      id: 'non-refundable-charges',
      number: 10,
      title: 'Non-Refundable Charges',
      content: (
        <>
          <p>
            Certain charges may be non-refundable where this was clearly disclosed before payment and the condition is permitted by applicable law. Any deduction, cancellation fee, or non-refundable deposit must be consistent with the applicable booking terms and legal requirements.
          </p>
          <p>
            WedWithMe will not rely on a general non-refundable clause to deny a refund where a refund is required by applicable law or a specific binding commitment.
          </p>
        </>
      ),
    },
    {
      id: 'disputes-unauthorised-transactions',
      number: 11,
      title: 'Disputes and Unauthorised Transactions',
      content: (
        <>
          <p>
            Users should promptly report transactions they believe are unauthorised, incorrect, duplicated, or fraudulent. They may also need to contact their bank or payment provider to secure their payment account and initiate the relevant dispute procedure.
          </p>
          <p>
            WedWithMe may review transaction records, booking information, and communications to investigate a payment dispute. Users must provide accurate information and cooperate reasonably with the investigation.
          </p>
        </>
      ),
    },
    {
      id: 'changes-to-policy',
      number: 12,
      title: 'Changes to This Policy',
      content: (
        <>
          <p>
            WedWithMe may update this Payment and Refund Policy to reflect changes in payment methods, platform features, operational procedures, or applicable legal requirements. The latest version will be published on the platform with an updated date where appropriate.
          </p>
        </>
      ),
    },
    {
      id: 'contact-and-support',
      number: 13,
      title: 'Contact and Support',
      content: (
        <>
          <p>
            For payment issues, refund requests, or cancellation-related questions, users should contact WedWithMe Platform Private Limited through the official contact details published on the website and include their booking or transaction reference:
          </p>
          <div className="highlight-box">
            <strong>Payment &amp; Refund Desk:</strong>
            <br />
            <strong>Company:</strong> WedWithMe Platform Private Limited
            <br />
            <strong>Email:</strong> primepixelgmb@gmail.com
            <br />
            <strong>Helpline:</strong> +91 6399239252
            <br />
            <strong>Working Hours:</strong> Mon - Sat, 10:00 AM - 7:00 PM IST
          </div>
          <p>
            All payment and refund requests will be reviewed according to the applicable booking terms, the circumstances of the transaction, and the laws in force in India.
          </p>
        </>
      ),
    },
  ];

  const summaryHighlights = [
    {
      icon: '🔐',
      title: 'Safe & Secure Gateways',
      description: 'Transactions processed through verified RBI-compliant payment aggregators with end-to-end encryption.',
    },
    {
      icon: '🛡️',
      title: 'Escrow & Clear Timelines',
      description: 'Vendor advances held safely until milestone validation, preventing no-shows and lost deposits.',
    },
    {
      icon: '🔄',
      title: 'Transparent Refund SLA',
      description: 'Direct reversals to original payment sources for eligible cancellations and duplicate debits.',
    },
  ];

  return (
    <LegalPageLayout
      currentSlug="payment-refund"
      documentTitle="Payment & Refund Policy"
      documentSubtitle="Clear conditions governing booking advances, platform payments, cancellation eligibility, and refund timelines for WedWithMe Platform Private Limited."
      effectiveDate="8 October 2026"
      lastUpdated="8 October 2026"
      sections={sections}
      summaryHighlights={summaryHighlights}
    />
  );
}
