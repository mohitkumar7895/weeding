# WedWithMe (From Match to Marriage) — Full Project Architecture & Documentation

---

## 🌟 Executive Summary
**WedWithMe** is an enterprise-grade, AI-powered hybrid wedding platform built for India's $130B+ wedding economy. It uniquely integrates **matrimonial matchmaking (AI + 36-Guna Kundali)** with an **end-to-end wedding vendor marketplace (Venues, Caterers, Decorators, Photographers) backed by 25% advance escrow protection**.

---

## 🏗️ 1. Technical Stack & Architecture

### **Frontend**
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript.
- **Styling Architecture**: Custom Vanilla CSS Design System with Styled-JSX scoped styling.
- **SSR Style Hydration**: Custom `StyledJsxRegistry` (`src/app/registry.tsx`) using `useServerInsertedHTML` to stream styles directly into the server HTML `<head>`, eliminating layout flash (FOUC).
- **Interactive Animations**: Native zero-dependency `IntersectionObserver` & `MutationObserver` engine (`src/components/ScrollAnimationManager.tsx`) managing scroll reveals, live character-by-character typewriter typing (`[data-typewriter]`), and stats ticker easing (`[data-count-to]`).

### **Backend & APIs**
- Next.js Route Handlers (`src/app/api/...`) with JSON payloads.
- JWT-based multi-role session tokens via HTTP-only secure cookies.
- Real-time Escrow transaction calculation and anti-double-booking locks.

### **Database & DR**
- **Engine**: MySQL (127.0.0.1:3306) with 50 production-grade relational tables.
- **Data Models**: Users, Profiles, Kundalis, Astrological Calculations, Vendors, Services, Packages, Booking Inquiries, Escrow Milestones, Sagun AI Conversation Logs, and Reviews.

---

## 📱 2. Dual-Viewport Architecture (Desktop + Mobile)

The application automatically checks screen breakpoints in `src/app/page.tsx`:
- **Desktop Screens (> 768px)**: Displays the full desktop luxury landing page:
  - Sticky emerald navbar with gold accents and pink CTA.
  - Full-bleed sunset hero backdrop with live continuous typewriter pill bar.
  - 5 Quick Service Cards.
  - Top Wedding Vendors grid (Photographers, Caterers, Decorators, Venues).
  - Meet Sagun AI emerald banner with audio wave visualizer.
  - "Why Choose WedWithMe?" 5-column grid.
  - Live statistics ticker bar.
  - Enterprise multi-column footer.
- **Mobile Screens (<= 768px)**: Mounts `MobileAppView.tsx` with a native mobile application feel:
  - Top monogram header with quick location badge (`📍 Delhi NCR`).
  - Mobile bottom application navigation bar (`MobileBottomNav.tsx`) with 5 tabs (`Home`, `Matches`, `Bookings`, `Vendors`, `Profile`) and active pink glow indicator.

---

## 🎨 3. Brand Identity & Design System

- **Primary Logo**: Intertwined `W♥W` emblem in a vibrant celebratory pink gradient (`#ff2a73` to `#e6005c`) with an optical glow.
- **Brand Text**: Yellow/Gold (`#e5c158`) with subtext in soft cream (`#fae8a4`).
- **Primary Buttons & CTAs**: Pink gradient (`linear-gradient(135deg, #ff2a73 0%, #e6005c 100%)`) with drop shadow (`0 4px 16px rgba(230, 0, 92, 0.38)`).
- **Secondary / AI CTAs**: Gold gradient (`linear-gradient(135deg, #fae8a4 0%, #e5c158 100%)`) with dark text (`#121c17`).
- **Surface Palettes**: Deep Royal Emerald (`#031710` to `#062a1c`) for headers, footers, stats, and AI banners; crisp White (`#ffffff`) for service cards and vendor grids.
- **Custom Scrollbar**: Sleek 6px pink/gold gradient thumb with translucent forest green track across all dialogs and modals.

---

## 📂 4. Core Directory Structure & Key Files

```
c:\Users\Mohit Kumar\Desktop\weeding\
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout, StyledJsxRegistry, ScrollAnimationManager
│   │   ├── registry.tsx              # Styled-JSX SSR insertion registry (eliminates FOUC)
│   │   ├── page.tsx                  # Home landing page with responsive desktop/mobile switcher
│   │   ├── globals.css               # Global CSS variables, scrollbars, typewriter ink cursor
│   │   ├── vendors/page.tsx          # Full vendor directory with multi-filters & booking
│   │   ├── matches/page.tsx          # AI Kundali & Matrimonial matches discovery
│   │   ├── bookings/page.tsx         # User booking history & Escrow milestone dashboard
│   │   ├── about/page.tsx            # About Us, platform trust, team & contact
│   │   ├── dashboard/page.tsx        # Couple / Matrimony user portal
│   │   ├── vendor/page.tsx           # Vendor CRM & inquiry management dashboard
│   │   ├── admin/page.tsx            # Super Admin platform controls & analytics
│   │   └── api/                      # Next.js Server Route Handlers
│   │       ├── auth/                 # Login, Register, Logout, Session check
│   │       ├── vendors/              # Vendor retrieval, filtering, creation
│   │       ├── matches/              # Matrimonial profiles, Kundali matching
│   │       ├── bookings/             # Booking creation & escrow payment allocation
│   │       └── sagun/                # AI Assistant conversation & recommendations
│   ├── components/
│   │   ├── Navbar.tsx                # Desktop & mobile responsive header with W♥W logo
│   │   ├── HeroSection.tsx           # Sunset backdrop, search bar & live typewriter pill
│   │   ├── QuickFeatures.tsx         # 5 service pill cards (Match, Vendors, Pay, Track, Sagun)
│   │   ├── TopVendors.tsx            # 4 category cards (Photo, Cater, Decor, Venue) + Booking Modal
│   │   ├── AIAssistantBanner.tsx     # Sagun AI banner with gold button & Hindi speech bubble
│   │   ├── SagunModal.tsx            # Interactive chat & voice simulation dialog
│   │   ├── WhyChooseUs.tsx           # 5-column pastel icon grid (AI, Vendors, Pay, Global, 24/7)
│   │   ├── StatsBar.tsx              # 4-col stats bar with animated count-up ticker
│   │   ├── Footer.tsx                # Enterprise footer with app download badges
│   │   ├── AuthModal.tsx             # Emerald glass modal for Bride/Groom, Vendor, Guest
│   │   ├── MobileAppView.tsx         # Full mobile view mirroring native wedding app screens
│   │   ├── MobileBottomNav.tsx       # Fixed 5-tab mobile bottom app navigation bar
│   │   └── ScrollAnimationManager.tsx# Scroll typewriter & ticker animation engine
│   ├── context/                      # React Context providers for global user & search state
│   └── lib/                          # Database connection pool & 50-table schema definitions
```

---

## 🔄 5. Detailed End-to-End User Journeys

### **Journey A: Vendor Discovery & Escrow Booking**
1. **Discovery**:
   - User browses the **Top Wedding Vendors** section on the home page or visits `/vendors`.
   - Four primary verified categories are presented:
     - **Photographers** (Capture Your Special Moments — ★ 4.8)
     - **Caterers** (Delicious Food for Every Moment — ★ 4.7)
     - **Decorators** (Turn Dreams into Reality — ★ 4.9)
     - **Venues** (Stunning Spaces for Your Big Day — ★ 4.6)
2. **Interactive Modal**:
   - User clicks any vendor card to open the **Booking Details Modal**.
   - Modal displays sticky cover header with category and escrow protection tags.
   - User reviews **Highlights & Amenities** (Royal Setup, 100% Verified, 4K Cinematics, Valet, Royal Feast).
   - User selects a package tier: **Premium Package** (full 2-day celebration), **Royal Gold** (1-day grand ceremony), or **Essential Silver** (single event coverage).
3. **Reservation & Anti-Double-Booking**:
   - User picks an event date via the HTML5 date picker (past dates disabled) and selects expected guest count.
   - User adds special dietary, drone, or equipment requirements.
   - Pricing summary calculates the **25% Advance Escrow Deposit**.
4. **Confirmation**:
   - Clicking **"Confirm & Pay Advance →"** posts to `/api/bookings`.
   - An escrow token ID is returned, the booking is recorded in the database, and user can view real-time status in `/bookings`.

---

### **Journey B: AI Matrimonial & Kundali Matching**
1. User navigates to `/matches` or clicks "Find Your Match" from Quick Features.
2. The AI algorithm compares:
   - Astrological birth charts (Guna Milan out of 36 points).
   - Cultural, dietary, and location preferences.
   - Verified educational and financial background.
3. User reviews profile cards with compatibility percentages and can send direct interest requests.

---

### **Journey C: Sagun AI Wedding Assistant (Voice + Chat)**
1. On the home page, the **Meet Sagun** banner displays a Hindi greeting:
   *"नमस्ते! मैं हूँ शगुन, आपकी AI वेडिंग असिस्टेंट! आप कैसे मदद कर सकती हूँ?"*
   typing out letter by letter as it scrolls into view.
2. Clicking **"Try Now →"** opens `SagunModal.tsx`.
3. User can type or voice-simulate queries:
   - *"Find me royal palace venues in Jaipur under ₹15 Lakhs"*
   - *"What are the auspicious wedding dates (Shubh Muhurat) for November?"*
   - *"Calculate Kundali compatibility for Aries and Leo"*
4. Sagun analyzes the context, queries available database vendors, and suggests personalized recommendations with one-click booking triggers.

---

### **Journey D: Multi-Role Authentication**
1. Clicking **Login** or **Register** in the navbar opens `AuthModal.tsx`.
2. Three interactive role chips allow users to switch contexts:
   - **Bride / Groom**: Accesses matrimonial matching and wedding checklists.
   - **Wedding Vendor**: Accesses vendor listing management and inquiry quotes.
   - **Guest / Family**: Accesses RSVP, digital registry, and event itinerary.
3. Successful authentication sets a secure cookie and redirects users to their designated portal (`/dashboard`, `/vendor`, or `/admin`).

---

## ⚡ 6. Scroll & Typewriter Animation Engine

Located in `src/components/ScrollAnimationManager.tsx`:
1. **IntersectionObserver**: Monitors elements with `.reveal-on-scroll`, `[data-typewriter]`, and `[data-count-to]`.
2. **Character-by-Character Typewriter**:
   - When an element enters the viewport, it clears placeholder text and inserts an animated cursor (`.typewriter-ink-cursor`).
   - Characters are appended at a measured 28ms cadence.
   - Once typing finishes, the ink cursor blinks for 2.5s before self-cleanup.
3. **Numeric Count-Up Ticker**:
   - Eases from `0` to the target number (e.g. `50000`, `10000`, `100`) over 1400ms, formatting with Indian locale commas (`50,000+`).
4. **MutationObserver**:
   - Watches for route transitions and dynamically rendered components, ensuring newly mounted DOM elements are automatically bound.

---

## 🛠️ 7. Development & Deployment Commands

```bash
# Start local development server (port 3000)
npm run dev

# Run TypeScript compiler verification (0 errors)
npx tsc --noEmit

# Production build
npm run build

# Start production server
npm start
```
