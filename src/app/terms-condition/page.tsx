'use client';

import React from 'react';
import LegalPageLayout, { LegalSection } from '@/components/LegalPageLayout';

export default function TermsConditionPage() {
  const sections: LegalSection[] = [
    {
      id: 'acceptance-of-terms',
      number: 1,
      title: 'Acceptance of Terms',
      content: (
        <>
          <p>
            These Terms and Conditions govern access to and use of the WedWithMe website, mobile applications, vendor portal, customer portal, and related services operated by WedWithMe Platform Private Limited (“WedWithMe”, “Company”, “we”, “us”, or “our”).
          </p>
          <p>
            By accessing or using the platform, creating an account, submitting an enquiry, registering as a vendor, or using any available service, you agree to these Terms and Conditions and the applicable policies published on our platform. If you do not agree with these terms, you should discontinue using the relevant services.
          </p>
        </>
      ),
    },
    {
      id: 'about-wedwithme',
      number: 2,
      title: 'About WedWithMe',
      content: (
        <>
          <p>
            WedWithMe is a digital platform intended to help users discover wedding-related services, including venues, caterers, decorators, photographers, videographers, wedding planners, beauty professionals, clothing providers, entertainment services, travel services, and other related businesses.
          </p>
          <p>
            Depending on the features available, the platform may allow customers to submit enquiries, communicate with vendors, request quotations, manage wedding-related activities, and access matchmaking features for eligible adults.
          </p>
          <p>
            Unless expressly stated otherwise, WedWithMe acts as a platform connecting customers and independent service providers. The actual wedding services are generally provided by the relevant vendors under their own service arrangements with customers.
          </p>
        </>
      ),
    },
    {
      id: 'user-accounts-and-eligibility',
      number: 3,
      title: 'User Accounts and Eligibility',
      content: (
        <>
          <p>
            Users must provide accurate, current, and complete information when creating an account and must update their information when necessary. Users are responsible for protecting their login credentials and for activities carried out through their accounts.
          </p>
          <p>
            Users must not impersonate another person, provide misleading information, create accounts for unlawful purposes, or attempt to gain unauthorised access to the platform. WedWithMe may restrict, suspend, or terminate accounts where there are reasonable grounds to suspect fraud, abuse, security risks, or violations of these terms, subject to applicable law.
          </p>
          <div className="important-box">
            <strong>Eligibility Requirement:</strong> Users must meet the legal eligibility requirements applicable to the services they access. Matchmaking services, where available, are strictly restricted to eligible adults aged 18 years or older.
          </div>
        </>
      ),
    },
    {
      id: 'vendor-registration-responsibilities',
      number: 4,
      title: 'Vendor Registration and Responsibilities',
      content: (
        <>
          <p>
            Vendors may be required to provide accurate business information, service descriptions, contact details, pricing information, photographs, and verification documents. Vendors are responsible for ensuring that their listings are genuine, lawful, current, and not misleading.
          </p>
          <p>
            Vendors must provide services in accordance with the commitments they make to customers, applicable laws, agreed prices, and confirmed booking terms. Vendors must not post fraudulent listings, misuse customer information, engage in discriminatory or unlawful conduct, or make false claims about their services.
          </p>
          <p>
            WedWithMe may review vendor listings, request additional information, remove inappropriate content, or restrict vendor accounts where reasonably necessary to protect users and maintain platform integrity.
          </p>
        </>
      ),
    },
    {
      id: 'customer-responsibilities',
      number: 5,
      title: 'Customer Responsibilities',
      content: (
        <>
          <p>
            Customers are responsible for reviewing vendor information, asking relevant questions, confirming service availability, understanding quotation details, and checking the terms of a booking before making payment or entering into an agreement.
          </p>
          <p>
            Customers should ensure that event dates, locations, guest counts, service requirements, and contact details are accurate. Any specific arrangements, deposits, cancellation conditions, or additional charges should be confirmed with the relevant vendor before a booking is finalised.
          </p>
        </>
      ),
    },
    {
      id: 'enquiries-bookings-relationships',
      number: 6,
      title: 'Enquiries, Bookings, and Vendor Relationships',
      content: (
        <>
          <p>
            Submitting an enquiry does not automatically create a confirmed booking. A booking will be considered confirmed only when the applicable confirmation process has been completed, which may include acceptance by the vendor, payment of an agreed amount, or another confirmation method specified for the service.
          </p>
          <p>
            Vendors may independently determine service availability, pricing, delivery arrangements, and booking conditions, subject to applicable law and any commitments made through the platform. WedWithMe does not guarantee that a particular vendor will be available or that every enquiry will result in a booking.
          </p>
        </>
      ),
    },
    {
      id: 'payments-cancellations-refunds',
      number: 7,
      title: 'Payments, Cancellations, and Refunds',
      content: (
        <>
          <p>
            Where payment facilities are available, users must follow the payment instructions displayed on the platform. Payments may be processed through third-party payment service providers and may be subject to their applicable terms.
          </p>
          <p>
            Cancellation eligibility, refund amounts, processing timelines, and applicable deductions will be governed by the relevant booking terms and the WedWithMe Payment and Refund Policy. Users should review those conditions before completing a transaction.
          </p>
          <div className="highlight-box">
            <strong>See Detailed Terms:</strong> Please refer to our dedicated <a href="/payment-refund" style={{ color: '#031710', fontWeight: 'bold', textDecoration: 'underline' }}>Payment &amp; Refund Policy</a> for exact terms, escrow procedures, and refund schedules.
          </div>
        </>
      ),
    },
    {
      id: 'prohibited-activities',
      number: 8,
      title: 'Prohibited Activities',
      content: (
        <>
          <p>
            Users must not use the platform for fraud, harassment, threats, spam, unlawful activities, misleading advertising, unauthorised data collection, malware distribution, or infringement of another person&apos;s rights.
          </p>
          <p>
            Users must not interfere with the platform&apos;s security, attempt to access restricted systems, scrape information without authorisation, manipulate reviews, or misuse another user&apos;s account or personal information.
          </p>
        </>
      ),
    },
    {
      id: 'intellectual-property',
      number: 9,
      title: 'Intellectual Property',
      content: (
        <>
          <p>
            The platform&apos;s software, branding, logos, designs, text, graphics, and other original materials are owned by or licensed to WedWithMe, except where otherwise indicated. Users may not reproduce, distribute, modify, commercially exploit, or use such materials without appropriate authorisation.
          </p>
          <p>
            Users retain rights in content they lawfully own and submit to the platform. By submitting content, users grant WedWithMe the limited permissions reasonably necessary to host, display, process, and distribute that content to operate the requested services, subject to applicable law and the platform&apos;s Privacy Policy.
          </p>
        </>
      ),
    },
    {
      id: 'platform-availability-disclaimers',
      number: 10,
      title: 'Platform Availability and Disclaimers',
      content: (
        <>
          <p>
            WedWithMe aims to maintain a useful and reliable platform but does not guarantee uninterrupted, error-free, or continuous availability. Features may be modified, suspended, or discontinued for maintenance, security, operational, or legal reasons.
          </p>
          <p>
            Vendor information, pricing, photographs, availability, and service descriptions may be supplied by independent vendors. Users should verify important details directly before relying on them. Nothing in these terms excludes liability that cannot lawfully be excluded under applicable law.
          </p>
        </>
      ),
    },
    {
      id: 'suspension-and-termination',
      number: 11,
      title: 'Suspension and Termination',
      content: (
        <>
          <p>
            WedWithMe may suspend or restrict access where reasonably necessary due to violations of these terms, suspected fraudulent activity, security concerns, legal requirements, or misuse of the platform.
          </p>
          <p>
            Users may discontinue using the platform and request account deletion through the available account settings or support channels. Certain records may be retained where required by law or necessary to resolve disputes and protect legitimate legal interests.
          </p>
        </>
      ),
    },
    {
      id: 'privacy',
      number: 12,
      title: 'Privacy',
      content: (
        <>
          <p>
            The collection and processing of personal information are governed by the WedWithMe Privacy Policy. Users should review that policy to understand how their information is handled and what privacy choices may be available.
          </p>
        </>
      ),
    },
    {
      id: 'changes-to-terms',
      number: 13,
      title: 'Changes to Terms',
      content: (
        <>
          <p>
            WedWithMe may revise these Terms and Conditions from time to time. Updated terms will be published on the relevant platform page. Where required by law, users will be provided with appropriate notice or an opportunity to provide consent.
          </p>
        </>
      ),
    },
    {
      id: 'governing-law-and-contact',
      number: 14,
      title: 'Governing Law and Contact',
      content: (
        <>
          <p>
            These Terms and Conditions are governed by the laws of India, subject to applicable legal requirements. Any dispute will be handled by the courts or dispute-resolution mechanisms having appropriate jurisdiction under applicable law.
          </p>
          <div className="highlight-box">
            <strong>Legal Correspondence &amp; Official Inquiries:</strong>
            <br />
            <strong>Company:</strong> WedWithMe Platform Private Limited
            <br />
            <strong>Headquarters:</strong> Jebda Makkhanpur, Sadupur Shikohabad, Firozabad, Uttar Pradesh, India
            <br />
            <strong>Wedding Helpline / Support:</strong> +91 6399239252
            <br />
            <strong>Email Support:</strong> support@wedwithme.com • concierge@wedwithme.com
            <br />
            <strong>Jurisdiction:</strong> Courts having competent jurisdiction in India
          </div>
          <p>
            For questions regarding these terms, users may contact WedWithMe Platform Private Limited using the official contact details published on the website.
          </p>
        </>
      ),
    },
  ];

  const summaryHighlights = [
    {
      icon: '🤝',
      title: 'Trusted Marketplace',
      description: 'Clear rules and accountability for customers and vendors connecting across India.',
    },
    {
      icon: '🛡️',
      title: 'Integrity & Verification',
      description: 'Zero tolerance for fraudulent listings, duplicate profiles, or abusive communications.',
    },
    {
      icon: '⚖️',
      title: 'Indian Legal Jurisdiction',
      description: 'Fair governance in accordance with Indian e-commerce, IT, and consumer protection laws.',
    },
  ];

  return (
    <LegalPageLayout
      currentSlug="terms-condition"
      documentTitle="Terms & Conditions"
      documentSubtitle="Review the rules, responsibilities, and legal framework governing the use of WedWithMe Platform Private Limited for customers, vendors, and matrimonial members."
      effectiveDate="8 October 2026"
      lastUpdated="8 October 2026"
      sections={sections}
      summaryHighlights={summaryHighlights}
    />
  );
}
