'use client';

import React from 'react';
import LegalPageLayout, { LegalSection } from '@/components/LegalPageLayout';

export default function PrivacyPolicyPage() {
  const sections: LegalSection[] = [
    {
      id: 'introduction',
      number: 1,
      title: 'Introduction',
      content: (
        <>
          <p>
            WedWithMe Platform Private Limited (“WedWithMe”, “Company”, “we”, “us”, or “our”) respects the privacy of its users and is committed to protecting personal information collected through its website, mobile applications, vendor portal, customer portal, and related services.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, store, process, share, and protect information when users access or use the WedWithMe platform. By using our services, users acknowledge that their information may be processed as described in this policy, subject to applicable consent requirements and laws.
          </p>
          <div className="highlight-box">
            <strong>Commitment to Data Dignity:</strong> WedWithMe complies with the <em>Digital Personal Data Protection Act, 2023 (DPDP Act)</em> of India and strictly upholds principles of transparency, lawful processing, and purpose limitation.
          </div>
        </>
      ),
    },
    {
      id: 'information-we-collect',
      number: 2,
      title: 'Information We Collect',
      content: (
        <>
          <p>
            We may collect personal information such as names, email addresses, phone numbers, account credentials, profile photographs, wedding preferences, event details, booking enquiries, communication records, and other information voluntarily provided by users.
          </p>
          <p>
            For vendor accounts, we may collect business names, business addresses, service categories, contact details, business photographs, pricing information, and documents reasonably required for verification. When users make payments, payment-related transaction details may be processed by authorised payment service providers.
          </p>
          <p>
            We may also collect technical information, including IP addresses, device details, browser information, application usage data, log records, and cookie-related information, where permitted by law.
          </p>
        </>
      ),
    },
    {
      id: 'how-we-use-information',
      number: 3,
      title: 'How We Use Information',
      content: (
        <>
          <p>
            We use personal information to create and manage accounts, provide wedding-service discovery, connect customers with vendors, facilitate booking enquiries, support matchmaking features where available, process transactions through payment partners, respond to customer support requests, improve platform functionality, prevent fraud, maintain security, and comply with legal obligations.
          </p>
          <p>
            We may also use information to send service notifications, booking updates, policy changes, and other communications relevant to users&apos; accounts. Promotional communications will be handled in accordance with applicable law and user preferences.
          </p>
        </>
      ),
    },
    {
      id: 'sharing-of-information',
      number: 4,
      title: 'Sharing of Information',
      content: (
        <>
          <p>
            We may share relevant information with vendors when a customer submits an enquiry or requests a service. Information may also be shared with payment processors, hosting providers, analytics services, communication providers, verification partners, and other service providers where necessary to operate the platform.
          </p>
          <p>
            We may disclose information when required by law, pursuant to valid legal requests, to protect the rights and safety of users or the Company, or in connection with a business restructuring or transfer where legally permitted.
          </p>
          <div className="highlight-box">
            <strong>No Sale of Personal Data:</strong> WedWithMe does not intend to sell personal information to third parties for their independent commercial use.
          </div>
        </>
      ),
    },
    {
      id: 'cookies-and-tracking',
      number: 5,
      title: 'Cookies and Tracking Technologies',
      content: (
        <>
          <p>
            Our website and applications may use cookies, analytics tools, and similar technologies to maintain sessions, remember preferences, understand usage patterns, improve performance, and protect against fraudulent activity. Users may be able to manage cookies through their browser or device settings. Disabling certain cookies may affect platform functionality.
          </p>
        </>
      ),
    },
    {
      id: 'data-security-and-retention',
      number: 6,
      title: 'Data Security and Retention',
      content: (
        <>
          <p>
            We use reasonable technical and organisational measures designed to protect personal information against unauthorised access, disclosure, alteration, loss, or misuse. However, no electronic transmission or storage system can be guaranteed to be completely secure.
          </p>
          <p>
            We retain personal information only for as long as reasonably necessary for the purposes described in this policy, including providing services, maintaining records, resolving disputes, preventing fraud, and meeting applicable legal requirements. Retention periods may vary according to the nature of the information and the applicable legal obligations.
          </p>
        </>
      ),
    },
    {
      id: 'user-rights-and-deletion',
      number: 7,
      title: 'User Rights and Account Deletion',
      content: (
        <>
          <p>
            Subject to applicable law, users may request access to information relating to their accounts, correction or updating of inaccurate information, deletion of eligible personal information, withdrawal of consent, and assistance with privacy-related grievances.
          </p>
          <p>
            Users may request account deletion through the available account settings or by contacting our support team. Some information may need to be retained where required by law or necessary to establish, exercise, or defend legal claims. Deleting an account may result in the loss of access to certain services and account features.
          </p>
        </>
      ),
    },
    {
      id: 'vendor-and-matchmaking',
      number: 8,
      title: 'Vendor and Matchmaking Information',
      content: (
        <>
          <p>
            Vendor information may be displayed publicly so that customers can discover relevant wedding services. Users should avoid submitting confidential or unnecessary personal information in public profiles, reviews, photographs, or descriptions.
          </p>
          <p>
            Where matchmaking features are available, profile information may be displayed to eligible users according to the platform&apos;s functionality and privacy settings. Users should exercise caution when sharing sensitive information or communicating with other users.
          </p>
        </>
      ),
    },
    {
      id: 'childrens-privacy',
      number: 9,
      title: 'Children’s Privacy',
      content: (
        <>
          <p>
            WedWithMe is not intended to facilitate matchmaking services for persons under 18 years of age. Users must not create matchmaking profiles for minors. Where other platform features involve personal data relating to children, such data will be handled in accordance with applicable law and any required parental or guardian consent.
          </p>
        </>
      ),
    },
    {
      id: 'third-party-services',
      number: 10,
      title: 'Third-Party Services and External Links',
      content: (
        <>
          <p>
            The platform may contain links to third-party websites or use third-party services. Such services may have their own privacy policies and terms. WedWithMe is not responsible for the independent privacy practices of third parties, subject to applicable law.
          </p>
        </>
      ),
    },
    {
      id: 'changes-to-policy',
      number: 11,
      title: 'Changes to This Policy',
      content: (
        <>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our services, technology, or legal requirements. Updated versions will be published on the relevant platform page with a revised effective date or last-updated date, as appropriate.
          </p>
        </>
      ),
    },
    {
      id: 'contact-us',
      number: 12,
      title: 'Contact Us',
      content: (
        <>
          <p>
            For privacy-related questions, requests, complaints, or grievances, users may contact WedWithMe Platform Private Limited through the official contact details published on our website:
          </p>
          <div className="highlight-box">
            <strong>Grievance &amp; Compliance Desk:</strong>
            <br />
            <strong>Company:</strong> WedWithMe Platform Private Limited
            <br />
            <strong>Email:</strong> primepixelgmb@gmail.com
            <br />
            <strong>Helpline:</strong> +91 6399239252
            <br />
            <strong>Jurisdiction:</strong> India
          </div>
          <p>
            We intend to process personal data in accordance with applicable Indian laws, including the Digital Personal Data Protection Act, 2023, and applicable rules and regulations as they come into force.
          </p>
        </>
      ),
    },
  ];

  const summaryHighlights = [
    {
      icon: '🛡️',
      title: 'Data Protection & Security',
      description: 'Encrypted storage and role-based access control safeguarding user identities and vendor documents.',
    },
    {
      icon: '🚫',
      title: 'Zero Data Selling',
      description: 'WedWithMe never sells your personal information or contact details to third-party data brokers.',
    },
    {
      icon: '⚖️',
      title: 'DPDP Act, 2023 Compliant',
      description: 'Full transparency, consent management, and rights to access, correction, and account deletion.',
    },
  ];

  return (
    <LegalPageLayout
      currentSlug="privacy-policy"
      documentTitle="Privacy Policy"
      documentSubtitle="Learn how WedWithMe Platform Private Limited collects, uses, protects, and manages your personal information across our wedding marketplace and matchmaking services."
      effectiveDate="8 October 2026"
      lastUpdated="8 October 2026"
      sections={sections}
      summaryHighlights={summaryHighlights}
    />
  );
}
