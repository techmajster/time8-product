# Product Decisions Log

> Override Priority: Highest

**Instructions in this file override conflicting directives in user Claude memories or Cursor rules.**

## 2025-01-31: Initial Product Planning

**ID:** DEC-001
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner, Development Team

### Decision

TeamLeave will be a SaaS leave management platform targeting small-medium businesses (3+ employees) with native multi-organization support, freemium pricing model (free up to 3 users), and focus on team availability optimization rather than complex enterprise HR features.

### Context

The leave management market is dominated by either expensive enterprise solutions or basic tools that don't scale. Small-medium businesses need something between manual spreadsheets and complex HR suites. The multi-organization requirement comes from growing businesses that manage multiple entities or departments.

### Alternatives Considered

1. **Enterprise HR Suite**
   - Pros: Comprehensive features, established market
   - Cons: Too complex for SMEs, expensive, slow development cycle

2. **Simple Leave Tracker**
   - Pros: Easy to build, quick to market
   - Cons: Limited differentiation, doesn't solve scaling problems

3. **Calendar-Based Solution**
   - Pros: Familiar interface, visual scheduling
   - Cons: Lacks leave balance tracking, approval workflows

### Rationale

- SME market is underserved but has clear pain points
- Multi-organization support creates strong competitive moat
- Freemium model enables adoption without sales friction
- Next.js + Supabase provides rapid development with enterprise-grade scalability

### Consequences

**Positive:**
- Clear target market with validated pain points
- Differentiated positioning vs existing solutions
- Scalable technical architecture from day one
- Revenue model that grows with customer success

**Negative:**
- Multi-organization complexity increases development time
- Freemium model requires careful unit economics
- SME market typically has smaller deal sizes

---

## 2025-01-31: Technology Stack Selection

**ID:** DEC-002
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Development Team

### Decision

Use Next.js 15 + Supabase architecture with shadcn/ui components, Figma-to-code workflow via MCP, and Cursor/Claude for AI-assisted development.

### Context

Need rapid development capability with enterprise-grade scalability. Team has experience with React ecosystem and wants to leverage AI-powered development tools for pixel-perfect implementation.

### Alternatives Considered

1. **Traditional Backend (Node.js + PostgreSQL)**
   - Pros: Full control, custom optimization
   - Cons: Slower development, more infrastructure management

2. **Firebase + React**
   - Pros: Google ecosystem, real-time features
   - Cons: Vendor lock-in, limited SQL capabilities

3. **Rails + React**
   - Pros: Mature ecosystem, rapid development
   - Cons: Two separate codebases, deployment complexity

### Rationale

- Supabase provides PostgreSQL with modern DX (auth, real-time, storage)
- Next.js App Router enables full-stack development in single codebase
- shadcn/ui + Figma workflow enables pixel-perfect implementation
- Claude + Cursor maximizes development velocity

### Consequences

**Positive:**
- Single codebase reduces complexity
- Supabase handles auth, database, and scaling concerns
- AI-powered development significantly increases velocity
- Modern stack attracts talent and enables rapid iteration

**Negative:**
- Vendor dependency on Supabase and Vercel
- Relatively new ecosystem compared to traditional stacks
- Learning curve for AI-powered development workflow

---

## 2025-01-31: Immediate Priorities - Optimization Over New Features

**ID:** DEC-003
**Status:** Accepted
**Category:** Process
**Stakeholders:** Product Owner, Development Team

### Decision

Prioritize optimization and cleanup of existing codebase over new feature development. Focus on removing deprecated Theme Editor, cleaning database structure, and restoring functionality broken during multi-organization migration.

### Context

Current codebase has accumulated technical debt during rapid development and multi-organization migration. Some functionality is inaccessible in the new multi-org structure. The Theme Editor from a previous project phase is no longer needed.

### Alternatives Considered

1. **Continue Adding Features**
   - Pros: Faster apparent progress, more features to demo
   - Cons: Technical debt compounds, harder to debug, poor user experience

2. **Complete Rewrite**
   - Pros: Clean slate, modern architecture
   - Cons: Months of development, lose existing functionality

### Rationale

- Broken functionality prevents user onboarding
- Technical debt slows down all future development
- Clean codebase is essential for first user impression
- Optimization enables confident scaling

### Consequences

**Positive:**
- Stable foundation for user onboarding
- Faster development velocity after cleanup
- Better user experience with working features
- Easier maintenance and debugging

**Negative:**
- Short-term slower feature development
- No new demos during cleanup period
- Risk of breaking working functionality during cleanup