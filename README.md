# PropPilot — Real Estate Agency Inbox

A multi-tenant inbox system where real estate agencies receive and manage incoming contacts in real-time.

**Stack:** Vite + React + TypeScript + Supabase + Tailwind CSS

**Deployed at:** https://real-estate-agency-blue.vercel.app/

## Demo Accounts

**Agency 1: Sunrise Realty**
- Contact form: `/c/sunrise-realty`
- Agent login: `agent1@sunrise-realty.com` / `Test1234@`

**Agency 2: Metro Properties**
- Contact form: `/c/metro-properties`
- Agent login: `agent2@metro-properties.com` / `Test1234@`

---

## How to Run Locally

### Prerequisites
- Node.js 18+ and npm
- A Supabase project (free tier works)

### Setup Steps

1. **Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd Real-Estate-Agency
npm install
```

2. **Set up environment variables:**

Create a `.env` file in the root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

3. **Run the database setup:**

Execute `supabase-setup.sql` in your Supabase SQL Editor (this creates tables, RLS policies, and realtime).

4. **Create demo data:**

```sql
-- Create agencies
INSERT INTO agencies (slug, name) VALUES
  ('sunrise-realty', 'Sunrise Realty'),
  ('metro-properties', 'Metro Properties');

-- Get agency IDs
SELECT id, slug FROM agencies;

-- Create users in Supabase Dashboard → Authentication → Users
-- Then link them to agencies (replace UUIDs):
INSERT INTO profiles (id, agency_id) VALUES
  ('<user-id-1>', '<sunrise-realty-agency-id>'),
  ('<user-id-2>', '<metro-properties-agency-id>');
```

5. **Start the dev server:**
```bash
npm run dev
```

Visit `http://localhost:5173`

---

## How We Implemented RLS

### Two Distinct Audiences

**1. Anonymous Users (Public Form)**
- **Need:** Submit contacts without authentication
- **Access:** INSERT only on `contacts` table
- **Implementation:**
  - Policy: `anyone can submit contact` with `to anon, authenticated`
  - Can also READ `agencies` table (to look up agency ID by slug)
  - Cannot read existing contacts (no SELECT policy for anon)

**2. Authenticated Agents (Inbox)**
- **Need:** View and manage only their agency's contacts
- **Access:** SELECT and UPDATE on their own agency's contacts
- **Implementation:**
  - `profiles` table links `auth.users.id` → `agencies.id`
  - Policies filter by: `agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())`
  - Agents can read their own profile but not others

### Key Design Decisions

- **All filtering happens at the database level**, not in the app
- Anonymous users never see existing contacts (security by design)
- The `profiles` join ensures agents are scoped to exactly one agency
- Status updates are allowed but agents can't change the agency_id (enforced in UPDATE policy's `WITH CHECK`)

### Important Fix

Initially, the setup only allowed `anon` users to insert contacts, but the policy also needed to support `authenticated` users (for testing or when agents submit on behalf of customers). Changed to `to anon, authenticated` for both agencies SELECT and contacts INSERT.

---

## Avoiding Duplicates with Realtime

### The Problem
When you load initial data and subscribe to realtime simultaneously, a contact inserted during the fetch can appear twice:
1. In the initial query results
2. Via the realtime INSERT event

### Our Solution

**Track existing IDs in a `useRef` Set:**

```typescript
const existingIdsRef = useRef<Set<string>>(new Set());

// On initial load
const contactsList = (data || []) as Contact[];
setContacts(contactsList);
existingIdsRef.current = new Set(contactsList.map((c) => c.id));

// On realtime INSERT
const newContact = payload.new as Contact;
if (!existingIdsRef.current.has(newContact.id)) {
  setContacts((prev) => [newContact, ...prev]);
  existingIdsRef.current.add(newContact.id);
}
```

### Why This Works
- `useRef` persists across renders without triggering re-renders
- Initial fetch populates the Set with all existing IDs
- Realtime events are checked against the Set before being added
- Simple, reliable, and performant

---

## What We Left Out (and Why)

**Not Implemented:**
- ❌ Search/filter in the inbox
- ❌ Pagination (loads all contacts at once)
- ❌ Email notifications when contacts arrive
- ❌ Agency signup flow (admins create agencies manually)
- ❌ Agent self-registration (admins create users in Supabase)
- ❌ Delete contacts feature
- ❌ Detailed contact view or reply interface

**Why:**
The spec asked for a focused MVP: public form + inbox + realtime + multi-tenant RLS. These features weren't explicitly required and would have added scope. For a production app, search and pagination would be critical once you have 100+ contacts.

---

## Where AI Helped (and Where It Didn't)

### ✅ AI Was Helpful For:
- Scaffolding React Router setup and protected route boilerplate
- Generating TypeScript types for the database schema
- Tailwind CSS form and table layouts (saved tons of time)
- Initial RLS policy SQL (though I had to review and adjust)

### ❌ AI Caused Issues:
1. **Overly complex realtime patterns** — AI suggested multiple channels and complicated subscription logic when one channel was sufficient
2. **RLS blind spots** — Initially forgot that anonymous users need to READ agencies to look up by slug (not just INSERT contacts)
3. **Client-side filtering suggestions** — AI proposed filtering contacts in React instead of using RLS properly
4. **useState for duplicate tracking** — Suggested `useState` for the ID Set, which would cause unnecessary re-renders. `useRef` was the right choice.
5. **Type safety shortcuts** — Had to use `as any` in a few places because Supabase's generic typing was fighting with TypeScript strict mode

### Lessons Learned
AI is great for boilerplate and getting 80% there quickly. But for security-critical logic (RLS, auth), performance optimizations (refs vs state), and database design, human review is essential. I spent time debugging the anonymous user SELECT issue, which the AI's initial schema didn't account for.

---

## Project Structure

```
src/
├── components/
│   └── ProtectedRoute.tsx      # Auth guard for /inbox
├── contexts/
│   └── AuthContext.tsx         # Auth state management
├── hooks/
│   └── useAuth.ts             # Hook for accessing auth context
├── lib/
│   ├── supabase.ts            # Supabase client
│   └── types.ts               # TypeScript DB types
└── pages/
    ├── Home.tsx               # Landing page
    ├── ContactForm.tsx        # /c/:agencySlug
    ├── Login.tsx              # /login
    └── Inbox.tsx              # /inbox (realtime dashboard)
```

---

## Deployment

**Build:**
```bash
npm run build
```

**Vercel or Cloudflare Pages:**
- Set environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Deploy the `dist` folder or connect to Git

SPA routing is configured in `vercel.json` and `public/_redirects`.

---

## License

MIT
