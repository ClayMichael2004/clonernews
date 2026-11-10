# ClonerNews ⚡📰

A high-performance, responsive web reader for the [official Hacker News API](https://github.com/HackerNews/API), engineered from first principles with **Vanilla JavaScript (ES2022+)**, **CSS Tokens**, and **HTML5**.

Designed for speed, low bandwidth consumption, and effortless scanning, ClonerNews brings real-time updates, event-driven progressive loading, interactive community polls, and deeply nested comment threads to life without relying on heavy external runtime frameworks.

---

## 📑 Table of Contents
1. [Architectural Overview](#-architectural-overview)
2. [Key Features](#-key-features)
3. [Folder Structure](#-folder-structure)
4. [Quick Start & Setup](#-quick-start--setup)
5. [Running Unit Tests](#-running-unit-tests)
6. [Audit Checklist & Verification Guide](#-audit-checklist--verification-guide)
7. [API Endpoints & Compliance](#-api-endpoints--compliance)
8. [License & Credits](#-license--credits)

---

## 🏛 Architectural Overview

ClonerNews is built as a **cohesive, non-monorepo, cleanly layered single application** adhering strictly to the Separation of Concerns (SoC) principle:

```
┌─────────────────────────────────────────────────────────────┐
│                       UI / DOM Layer                        │
│   (Header, PostCard, PollView, CommentTree, LiveDrawer)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Dispatches Actions / Subscribes
┌──────────────────────────────▼──────────────────────────────┐
│                    Reactive State Store                     │
│               (Pub/Sub Centralized Store)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Invokes Services & API
┌──────────────────────────────▼──────────────────────────────┐
│                   Services & Domain Logic                   │
│   (LiveUpdateService [5s poller], NotificationService)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Requests Data & Caches
┌──────────────────────────────▼──────────────────────────────┐
│                      Data Access Layer                      │
│   (HNClient, LRUCache, RequestDeduplicator, Batcher)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Fetch HTTP
┌──────────────────────────────▼──────────────────────────────┐
│            Official Hacker News Firebase API / Algolia      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Features

### 1. Heterogeneous Post Types
- **Stories**: Real-time scores, authors (`by`), relative time (`time`), external domain links, and comment counts.
- **Jobs**: Employment posts directly pulled from `/v0/jobstories.json` with direct company links or job descriptions.
- **Community Polls**: Interactive polls fetched with their option parts (`parts`), live vote tallies, and percentage distribution bars.
- **Bonus Post Types**: Dedicated feeds for **Ask HN** (`/v0/askstories.json`) and **Show HN** (`/v0/showstories.json`) with question bodies and project links.

### 2. Strict Newest-to-Oldest Ordering
- All posts across feeds and search queries are sorted chronologically descending (`b.time - a.time`).
- All comments and sub-comment replies at every level of the comment tree are ordered strictly newest to oldest as mandated by the project requirements.

### 3. Events-Driven Progressive Loading
- Loads initial content in optimal chunks of **15 posts** (`CONFIG.PAGE_SIZE`).
- Loads more posts on demand using:
  1. High-performance **`IntersectionObserver`** sentinel targeting the bottom of the feed.
  2. Throttled **`window.onscroll`** listener (150ms limit).
  3. Explicit **"Load More Content"** button affordance for accessible, manual pagination.
- Includes shimmer placeholder skeletons, spinner animations, and error recovery buttons.

### 4. Live Data Updates (5-Second Polling Cadence)
- Regulated poller monitors `/v0/updates.json` and `/v0/maxitem.json` every **5,000 milliseconds**.
- **Real-time Notifications**: Toasts notify the user when displayed posts receive new votes or comments, or when brand new stories are published.
- **Live Stream Drawer**: A slide-over panel displaying incoming items with an instantaneous **"Merge All into Feed"** action that updates the view without losing place or scroll position.
- **Pulsing Status Indicator**: A live green badge in the header shows network heartbeat and pending unmerged update count.

### 5. Hierarchical Nested Comments
- Reconstructs arbitrary-depth comment trees from flat API payloads.
- Each comment displays an explicit **parent indicator** (e.g. `↳ direct post reply` or `↳ in reply to #50350977`).
- **Interactive Collapse / Expand**: Clicking `[-]` or `[+]` collapses entire subtrees, displaying the exact count of hidden replies (e.g. `(4 replies)`).
- Global **"Collapse All" / "Expand All"** toggle.

### 6. API Friendliness & Performance Safeguards
- **In-Memory LRU Cache**: O(1) Doubly Linked List + Map retains up to 500 recently accessed items to eliminate duplicate network traffic.
- **Request Deduplication**: In-flight promises are coalesced; simultaneous requests for the same ID share a single HTTP fetch.
- **Concurrency Limiter (Promise Pool)**: Batch requests are capped at 6 concurrent connections to prevent browser socket exhaustion.
- **Throttling & Debouncing**: Scroll events (150ms throttle), live polling (5,000ms throttle), and search input (250ms debounce).
- **Zero-Dependency HTML Sanitizer**: Cleans Hacker News self-text and comments using browser `DOMParser`, stripping `<script>`, malicious attributes, and enforcing `rel="noopener noreferrer nofollow"` on links.

---

## 📁 Folder Structure

```
clonernews/
├── index.html                   # Semantic HTML5 entry layout
├── package.json                 # Project scripts (start, test, dev)
├── server.js                    # Built-in lightweight HTTP static server
├── README.md                    # Project documentation & audit manual
├── documentation.md             # Technical design & DSA specification
├── css/
│   ├── variables.css            # Design tokens, color palette, dark theme
│   ├── base.css                 # Reset, typography, navigation bar, footer
│   ├── components.css           # Badges, cards, buttons, skeletons, modal dialog
│   ├── comments.css             # Nested thread indentation, lines, collapse states
│   ├── live.css                 # Live pulse badge, drawer panel, toast alerts
│   └── responsive.css           # Mobile and tablet media queries
├── js/
│   ├── config.js                # Endpoints, intervals (5s), pagination caps
│   ├── app.js                   # Application bootstrap and routing
│   ├── api/
│   │   ├── hnClient.js          # API client with exponential backoff & timeout
│   │   ├── cache.js             # O(1) LRU Cache (Doubly Linked List + Map)
│   │   ├── deduplicator.js      # In-flight Promise deduplication manager
│   │   └── requestBatcher.js    # Concurrency-bounded batch fetcher (Promise Pool)
│   ├── state/
│   │   ├── store.js             # Central Pub/Sub reactive state container
│   │   └── actions.js           # Business actions and feed dispatchers
│   ├── services/
│   │   ├── liveUpdateService.js # 5-second regulated live data poller
│   │   └── notificationService.js # Toast notifications manager
│   ├── utils/
│   │   ├── throttle.js          # Regulated throttle with leading/trailing edges
│   │   ├── debounce.js          # Debounce utility for search input
│   │   ├── time.js              # Relative timestamping & newest-first sorter
│   │   ├── sanitizer.js         # Safe HTML parser & XSS sanitizer
│   │   └── commentTree.js       # Hierarchical comment tree builder
│   └── components/
│       ├── Header.js            # Navigation tabs, search, filter, live status
│       ├── PostList.js          # Feed container with progressive loading
│       ├── PostCard.js          # Polymorphic renderer (Story, Job, Poll, Ask, Show)
│       ├── PollView.js          # Interactive poll options & percentage bars
│       ├── CommentTree.js       # Recursive nested comment threads
│       ├── LiveDrawer.js        # Dedicated live updates slide-over panel
│       └── Skeleton.js          # Shimmer loading placeholders
└── tests/
    ├── cache.test.js            # LRU Cache verification
    ├── deduplicator.test.js     # In-flight deduplication tests
    ├── commentTree.test.js      # Tree reconstruction & newest-first sort tests
    ├── throttle.test.js         # Throttling & debouncing timing tests
    ├── time.test.js             # Relative time & sorting tests
    ├── sanitizer.test.js        # XSS prevention & HTML sanitization tests
    └── hnClient.test.js         # Poll enrichment & error handling tests
```

---

## 🚀 Quick Start & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher; developed on Node v22) **or** [Python 3](https://python.org/).
- Any modern web browser (Chrome, Firefox, Safari, Edge).

### Running the Application

1. **Clone or enter the project directory:**
   ```bash
   cd /home/michaelochieng0/clonernews
   ```

2. **Start the local server:**
   ```bash
   npm start
   ```
   *Alternative without npm:*
   ```bash
   node server.js
   # Or using Python:
   python3 -m http.server 3000
   ```

3. **Open in your browser:**
   ```
   http://localhost:3000/
   ```

---

## 🧪 Running Unit Tests

The test suite runs using Node.js's native test runner (`node:test` & `node:assert`), requiring **zero third-party dependencies**:

```bash
npm test
```

### Test Coverage Highlights:
- **`cache.test.js`**: LRU eviction order, O(1) hash map access, capacity limits.
- **`deduplicator.test.js`**: Ensures 5 simultaneous calls for the same item ID trigger only 1 fetch.
- **`commentTree.test.js`**: Reconstructs N-ary tree, verifies exact parent linkages, and tests strict newest-to-oldest sorting across all child levels.
- **`throttle.test.js`**: Confirms leading edge, trailing edge, and 5-second cadence throttling.
- **`sanitizer.test.js`**: Verifies XSS attack vectors (`<script>`, inline handlers, `javascript:`) are safely stripped.

---

## 🔍 Audit Checklist & Verification Guide

This checklist corresponds directly with the official Zone01 Piscine JS audit evaluation criteria:

### 1. Functional Tests

#### ✅ Try to open a story post: Does this post open without any errors?
- **Action**: Click any post in the **⚡ New** or **🔥 Top** feed (or click its title / "View Details" button).
- **Result**: A detail dialog opens instantly showing the story title, author `@username`, score, time, external article link, and the discussion thread with all comments loaded without errors.

#### ✅ Try to open a job post: Does this post open without any errors?
- **Action**: Click the **💼 Jobs** navigation tab in the header. Click on any job listing (e.g. "Y/N is hiring...").
- **Result**: The job opens cleanly showing the job title, employer, posting time, direct career portal link, and full job description text.

#### ✅ Try to open a poll post: Does this post open without any errors?
- **Action**: Click the **📊 Polls** navigation tab in the header. Click on any community poll (e.g. *"Poll: What percentage of your professional code do you write by hand?"*).
- **Result**: The poll opens showing the total votes, each poll option, point totals, and animated percentage distribution bars, followed by the poll's comment threads.

#### ✅ Try to load more posts: Did the posts load without error and without spamming the user?
- **Action**: Scroll down near the bottom of the page, or click the **"Load More Content"** button.
- **Result**: Shimmer skeletons or a spinner briefly appear, and the next batch of 15 items smoothly appends to the feed. Network throttling prevents flooding, and no duplicate IDs are rendered.

#### ✅ Try to open a post with comments: Are the comments being displayed in the correct order (from newest to oldest)?
- **Action**: Open any active story with comments. Observe the timestamps of top-level comments and nested replies.
- **Result**: Comments at every depth are sorted strictly from newest to oldest (`b.time - a.time`). The timestamp on comment #1 is newer than or equal to comment #2, etc.

---

### 2. General Requirements

#### ✅ Does the UI have at least stories, jobs, and polls?
- **Result**: Yes. Dedicated tabs in the navigation bar allow instantaneous switching between:
  - ⚡ New Stories
  - 🔥 Top Stories
  - 💼 Tech Jobs
  - 📊 Community Polls
  - ❓ Ask HN (Bonus)
  - 💡 Show HN (Bonus)
- Additionally, a **Type Filter dropdown** lets you filter any active view by Stories, Jobs, or Polls.

#### ✅ Are the posts displayed in the correct order (from newest to oldest)?
- **Result**: Yes. All feeds default to "Order: Newest First" using the `sortByNewest()` algorithm (`b.time - a.time`).

#### ✅ Does each comment present the right parent post?
- **Result**: Yes. Every comment clearly presents its lineage:
  - Top-level comments display `↳ direct post reply` with the post ID.
  - Sub-comments display `↳ in reply to #[ParentID]`.
  - The modal header clearly binds all comments to the parent post title and ID.

#### ✅ Does the UI notify the user when a certain post is updated?
- **Result**: Yes. The `LiveUpdateService` polls `/v0/updates.json` every 5 seconds. When any post currently rendered on the user's feed receives new votes or comments, a toast notification alert pops up:
  `"Story Updated: '<Title>' received new activity (<Score> pts, <Descendants> comments)"`
  and the score updates live in-place!

#### ✅ Is the project using throttling to regulate the number of requests (every 5 seconds)?
- **Result**: Yes. The live polling engine runs on a strictly throttled 5,000ms loop via `throttle(this._performPoll, 5000)`. Scroll events are throttled to 150ms, and search queries are debounced to 250ms.

---

### 3. Bonus Features

#### 🌟 +Does the UI have more types of posts than stories, jobs and polls?
- **Result**: **YES!**
  - **Ask HN**: Displays questions submitted by the community with questions text and answers.
  - **Show HN**: Displays community projects, apps, and repositories with demo links.
  - **Type Badges**: Dynamic badges for `STORY`, `JOB`, `POLL`, `ASK HN`, and `SHOW HN`.

#### 🌟 +Have sub-comments (nested comments) been implemented?
- **Result**: **YES!**
  - Full recursive N-ary tree supporting arbitrary reply depth.
  - Distinct colored lineage guide lines matching depth level.
  - Collapse / Expand controls (`[-]` / `[+]`) on every single comment, displaying the number of collapsed replies.
  - Global "Collapse All" / "Expand All" master control.

---

## 🌐 API Endpoints & Compliance

ClonerNews communicates exclusively with official and public endpoints:
- Items: `https://hacker-news.firebaseio.com/v0/item/<id>.json`
- Feeds: `https://hacker-news.firebaseio.com/v0/{newstories,topstories,beststories,jobstories,askstories,showstories}.json`
- Live Updates: `https://hacker-news.firebaseio.com/v0/updates.json`
- Max Item ID: `https://hacker-news.firebaseio.com/v0/maxitem.json`
- Poll Discovery Index: `https://hn.algolia.com/api/v1/search_by_date?tags=poll`

---

## 📄 License & Credits
- Created by **michaelochieng0** for the Zone01 Piscine JS Raid.
- Built under the MIT License.
