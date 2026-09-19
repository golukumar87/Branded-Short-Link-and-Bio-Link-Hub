import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  LogOut,
  Moon,
  Palette,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  UserRound
} from "lucide-react";
import { Button } from "./components/ui/Button.jsx";
import { Card } from "./components/ui/Card.jsx";
import { Input, Textarea } from "./components/ui/Input.jsx";
import { Badge } from "./components/ui/Badge.jsx";
import "./styles.css";

const API = "";

const defaultBioLinks = [
  { label: "Portfolio", url: "https://ravish.dev" },
  { label: "GitHub", url: "https://github.com/ravishkumar" },
  { label: "LinkedIn", url: "https://www.linkedin.com/in/ravishkumar" }
];

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed() {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (
    response.status === 401 &&
    !options._retry &&
    !path.startsWith("/api/auth/login") &&
    !path.startsWith("/api/auth/signup") &&
    !path.startsWith("/api/auth/refresh")
  ) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" }
        });
        if (refreshRes.ok) {
          isRefreshing = false;
          onRefreshed();
          return request(path, { ...options, _retry: true });
        }
      } catch (_e) {
        // silent catch
      } finally {
        isRefreshing = false;
      }
    } else {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(() => {
          request(path, { ...options, _retry: true }).then(resolve).catch(reject);
        });
      });
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (route.startsWith("/bio/")) return <PublicBio username={route.split("/bio/")[1]} />;
  return <Dashboard />;
}

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUser() {
    try {
      const data = await request("/api/auth/me");
      setUser(data.user);
    } catch (_error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  if (loading) return <ScreenLoader />;
  if (!user) return <AuthScreen onDone={loadUser} error={error} setError={setError} />;

  return <Workspace user={user} setUser={setUser} onLogout={() => setUser(null)} />;
}

function AuthScreen({ onDone, error, setError }) {
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    resetToken: ""
  });
  const [notice, setNotice] = useState("");

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setNotice("");
    setShowPassword(false);
    setForm({
      name: "",
      email: "",
      username: "",
      password: "",
      resetToken: ""
    });
  }

  const pwStrength = useMemo(() => {
    const p = form.password || "";
    if (!p) return { score: 0, text: "" };
    let score = 0;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p)) score += 1;
    if (/[0-9]/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;
    const labels = ["Weak", "Fair", "Good", "Strong"];
    return { score, text: labels[score - 1] || "Weak" };
  }, [form.password]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      if (mode === "forgot") {
        const data = await request("/api/auth/forgot-password", { method: "POST", body: { email: form.email } });
        setNotice(`Reset token generated: ${data.resetToken || "check response"}`);
        setForm({ ...form, resetToken: data.resetToken || "" });
        setMode("reset");
        return;
      }

      if (mode === "reset") {
        const data = await request("/api/auth/reset-password", {
          method: "POST",
          body: { token: form.resetToken, password: form.password }
        });
        setNotice(data.message);
        switchMode("login");
        return;
      }

      const path = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const data = await request(path, { method: "POST", body: form });
      if (data.verificationToken) {
        setNotice(`Email verification is simulated. Token: ${data.verificationToken}`);
      }
      await onDone();
    } catch (err) {
      setError(err.message);
    }
  }

  function fillDemo() {
    setForm({
      name: "",
      email: "ravish@example.com",
      username: "",
      password: "Password123",
      resetToken: ""
    });
    setError("");
    setNotice("Demo credentials populated. Click Login to proceed.");
  }

  function clearForm() {
    setForm({
      name: "",
      email: "",
      username: "",
      password: "",
      resetToken: ""
    });
    setError("");
    setNotice("");
  }

  return (
    <main className="auth-shell">
      <div className="auth-animated-bg" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <section className="auth-copy">
        <Badge>Project 04</Badge>
        <h1>Branded Short-Link & Bio-Link Hub</h1>
        <p>
          A Bitly plus Linktree style application with secure auth, vanity short links,
          click analytics, QR codes and public creator bio pages.
        </p>
        <div className="auth-showcase">
          <div className="flow-card flow-card-main">
            <span>short.link/r/launch</span>
            <strong>1,284 clicks</strong>
            <small>Redirects, QR and telemetry are tracked live.</small>
          </div>
          <div className="flow-card">
            <span>/bio/ravish</span>
            <strong>Public bio page</strong>
            <small>Portfolio, GitHub and LinkedIn in one mobile page.</small>
          </div>
        </div>
      </section>
      <Card className="auth-panel">
        <div className="switcher">
          <Button variant={mode === "login" ? "primary" : "ghost"} onClick={() => switchMode("login")}>
            Login
          </Button>
          <Button variant={mode === "signup" ? "primary" : "ghost"} onClick={() => switchMode("signup")}>
            Signup
          </Button>
        </div>
        <form onSubmit={submit} className="stack" autoComplete="off">
          {mode === "signup" && (
            <>
              <Input
                label="Full Name"
                value={form.name}
                autoComplete="off"
                placeholder="Enter your full name"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
              <Input
                label="Username"
                value={form.username}
                autoComplete="off"
                placeholder="your-name"
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                required
              />
            </>
          )}
          {mode !== "reset" && (
            <Input
              label="Email"
              type="email"
              value={form.email}
              autoComplete="off"
              placeholder="you@example.com"
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          )}
          {mode === "reset" && (
            <Input
              label="Reset token"
              value={form.resetToken}
              placeholder="Paste reset token"
              onChange={(event) => setForm({ ...form, resetToken: event.target.value })}
              required
            />
          )}
          {mode !== "forgot" && (
            <>
              <Input
                label={mode === "reset" ? "New password" : "Password"}
                type={showPassword ? "text" : "password"}
                value={form.password}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
                rightElement={
                  <button
                    type="button"
                    className="pw-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              {mode === "signup" && form.password && (
                <div className="pw-strength-bar">
                  <div className="pw-meter">
                    {[1, 2, 3, 4].map((level) => (
                      <span
                        key={level}
                        className={`pw-segment ${pwStrength.score >= level ? `active lvl-${pwStrength.score}` : ""}`}
                      />
                    ))}
                  </div>
                  <small className="pw-label">Strength: <b>{pwStrength.text}</b></small>
                </div>
              )}
            </>
          )}
          {error && <p className="error">{error}</p>}
          {notice && <p className="notice">{notice}</p>}
          <Button type="submit" className="full">
            {mode === "login" && "Login"}
            {mode === "signup" && "Create account"}
            {mode === "forgot" && "Get reset token"}
            {mode === "reset" && "Reset password"}
          </Button>

          <div className="auth-helper-row">
            {mode === "login" && (
              <button type="button" className="btn-text-action" onClick={fillDemo}>
                <Sparkles size={13} /> Fill Demo Credentials
              </button>
            )}
            {(form.email || form.password || form.name) && (
              <button type="button" className="btn-text-action" onClick={clearForm}>
                Clear Form
              </button>
            )}
          </div>

          <div className="auth-links">
            {mode !== "forgot" && mode !== "reset" && (
              <button type="button" onClick={() => switchMode("forgot")}>Forgot password?</button>
            )}
            {(mode === "forgot" || mode === "reset") && (
              <button type="button" onClick={() => switchMode("login")}>Back to login</button>
            )}
          </div>
        </form>
      </Card>
    </main>
  );
}

function Workspace({ user, setUser, onLogout }) {
  const [links, setLinks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [bio, setBio] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [qr, setQr] = useState(null);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedLinkAnalytics, setSelectedLinkAnalytics] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [inspectedLink, setInspectedLink] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("hub_dark") === "true");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyModal, setVerifyModal] = useState(false);
  const [verifyTokenInput, setVerifyTokenInput] = useState(user?.emailVerificationToken || "");

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("hub_dark", darkMode);
  }, [darkMode]);

  async function loadAll(targetLinkId = selectedLinkAnalytics) {
    const analyticsQuery = targetLinkId && targetLinkId !== "all" ? `?linkId=${targetLinkId}` : "";
    const [linkData, analyticsData, bioData] = await Promise.all([
      request(`/api/links?search=${encodeURIComponent(search)}&page=${page}&limit=5`),
      request(`/api/links/analytics/summary${analyticsQuery}`),
      request("/api/bio/me")
    ]);
    setLinks(linkData.items);
    setPageInfo({ page: linkData.page, pages: linkData.pages || 1, total: linkData.total || 0 });
    setAnalytics(analyticsData);
    setBio(bioData.profile);
  }

  useEffect(() => {
    const timer = setTimeout(() => loadAll(selectedLinkAnalytics).catch((err) => setToast(err.message)), 250);
    return () => clearTimeout(timer);
  }, [search, page, selectedLinkAnalytics]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function logout() {
    await request("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  async function handleVerifyEmail(tokenToUse) {
    const token = tokenToUse || verifyTokenInput || user?.emailVerificationToken;
    if (!token) {
      setVerifyModal(true);
      return;
    }
    setVerifyingEmail(true);
    try {
      const res = await request("/api/auth/verify-email", { method: "POST", body: { token } });
      setToast(res.message || "Email verified successfully!");
      if (setUser) {
        setUser((prev) => ({ ...prev, emailVerified: true, emailVerificationToken: undefined }));
      }
      setVerifyModal(false);
    } catch (err) {
      setToast(err.message || "Email verification failed");
    } finally {
      setVerifyingEmail(false);
    }
  }

  const sortedLinks = useMemo(() => {
    const list = [...links];
    if (sortBy === "clicks") {
      return list.sort((a, b) => b.clicks - a.clicks);
    }
    if (sortBy === "az") {
      return list.sort((a, b) => (a.title || a.shortCode).localeCompare(b.title || b.shortCode));
    }
    return list;
  }, [links, sortBy]);

  const summary = useMemo(() => {
    const topLink = links.reduce((best, item) => (!best || item.clicks > best.clicks ? item : best), null);
    const devices = analytics?.deviceDistribution || [];
    const topDevice = devices.reduce((best, item) => (!best || item.clicks > best.clicks ? item : best), null);
    return {
      totalLinks: links.length,
      totalClicks: analytics?.totalClicks ?? 0,
      topLink: topLink?.title || topLink?.shortCode || "Create a link",
      topDevice: topDevice ? `${topDevice.device} traffic` : "No traffic yet"
    };
  }, [links, analytics]);

  async function exportLinksCsv() {
    try {
      const data = await request("/api/links?page=1&limit=50");
      const rows = [
        ["Title", "Destination URL", "Short URL", "Category", "Clicks", "Created At"],
        ...data.items.map((link) => [
          link.title || "Untitled",
          link.destinationUrl,
          link.shortUrl,
          link.tag || "General",
          link.clicks,
          new Date(link.createdAt).toLocaleString()
        ])
      ];
      const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "shortlink-hub-links.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      setToast("CSV exported");
    } catch (error) {
      setToast(error.message);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <Badge>Assessment build</Badge>
          <h1>ShortLink Hub</h1>
          <p className="topbar-subtitle">Branded short links, click analytics and a mobile-first bio page in one dashboard.</p>
        </div>
        <div className="top-actions">
          <span className="user-pill">
            <UserRound size={16} /> {user.name}
          </span>
          <span
            className={`status-pill ${user.emailVerified ? "status-verified" : "status-unverified"}`}
            title={user.emailVerified ? "Account email verified" : "Account unverified (simulated)"}
          >
            {user.emailVerified ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
            {user.emailVerified ? "Verified" : "Unverified"}
          </span>
          {!user.emailVerified && (
            <Button variant="outline" onClick={() => handleVerifyEmail(user.emailVerificationToken)}>
              Verify Email
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to Light mode" : "Switch to Dark mode"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <Button variant="outline" onClick={() => loadAll(selectedLinkAnalytics)}>
            <RefreshCw size={16} /> Refresh
          </Button>
          <Button variant="outline" onClick={logout}>
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </header>

      {!user.emailVerified && (
        <section className="verify-banner" role="alert">
          <div className="verify-content">
            <span className="verify-tag">Simulated Email Verification</span>
            <strong>Email verification pending for {user.email}</strong>
            <p>Simulate instant verification or enter your simulated token below.</p>
            {user.emailVerificationToken && (
              <div className="verify-token-chip">
                <code>Token: {user.emailVerificationToken}</code>
              </div>
            )}
          </div>
          <div className="verify-actions">
            <Button size="sm" onClick={() => handleVerifyEmail(user.emailVerificationToken)} disabled={verifyingEmail}>
              {verifyingEmail ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />} 1-Click Verify
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setVerifyTokenInput(user.emailVerificationToken || ""); setVerifyModal(true); }}>
              Enter Token
            </Button>
          </div>
        </section>
      )}

      <section className="quick-stats" aria-label="Quick stats">
        <StatCard icon={<LinkIcon size={18} />} label="Active links" value={pageInfo.total || summary.totalLinks} hint="Searchable library" />
        <StatCard icon={<TrendingUp size={18} />} label="Tracked clicks" value={summary.totalClicks} hint="Live redirect telemetry" />
        <StatCard icon={<Sparkles size={18} />} label="Best link" value={summary.topLink} hint="Highest click count" />
        <StatCard icon={<UserRound size={18} />} label="Audience" value={summary.topDevice} hint="Device distribution" />
      </section>

      {toast && (
        <div className="toast" role="status">
          {toast}
          <Button variant="ghost" onClick={() => setToast("")}>Dismiss</Button>
        </div>
      )}

      <section className="dashboard-grid">
        <CreateLink onCreated={() => loadAll(selectedLinkAnalytics)} setToast={setToast} />
        <Analytics
          analytics={analytics}
          links={links}
          selectedLink={selectedLinkAnalytics}
          onSelectLink={setSelectedLinkAnalytics}
        />
      </section>

      <section className="content-grid">
        <Card className="span-2">
          <div className="section-head">
            <div>
              <h2>Link Library</h2>
              <p>Manage destination URLs, short links, QR codes and deletion.</p>
            </div>
            <div className="library-actions">
              <div className="search-box">
                <Search size={16} />
                <input placeholder="Search links or tags" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <div className="sort-box">
                <ArrowUpDown size={15} />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort links">
                  <option value="newest">Newest First</option>
                  <option value="clicks">Most Clicks</option>
                  <option value="az">Title A-Z</option>
                </select>
              </div>
              <Button variant="outline" onClick={exportLinksCsv}><Download size={16} /> Export CSV</Button>
            </div>
          </div>
          <LinkTable
            links={sortedLinks}
            pageInfo={pageInfo}
            setPage={setPage}
            onChanged={() => loadAll(selectedLinkAnalytics)}
            setToast={setToast}
            setQr={setQr}
            onSelectLink={(id) => {
              setSelectedLinkAnalytics(id);
              setToast("Filtered analytics for selected link");
            }}
            onInspectLink={(link) => setInspectedLink(link)}
          />
        </Card>
        <BioBuilder profile={bio} onSaved={() => loadAll(selectedLinkAnalytics)} setToast={setToast} />
      </section>

      {qr && <QrModal qr={qr} onClose={() => setQr(null)} />}

      {inspectedLink && (
        <QuickStatsModal
          link={inspectedLink}
          onClose={() => setInspectedLink(null)}
          onViewAnalytics={(id) => {
            setSelectedLinkAnalytics(id);
            setInspectedLink(null);
            setToast("Loaded link analytics");
          }}
          onCopy={async (url) => {
            await navigator.clipboard.writeText(url);
            setToast("Copied short link");
          }}
        />
      )}

      {verifyModal && (
        <div className="modal-backdrop" onClick={() => setVerifyModal(false)}>
          <Card className="qr-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Email Verification Simulation</h2>
            <p style={{ color: "var(--muted)", fontSize: "14px", margin: "8px 0 16px" }}>
              Enter or paste your simulated verification token below to verify <code>{user.email}</code>.
            </p>
            <Input
              label="Simulation Token"
              value={verifyTokenInput}
              onChange={(e) => setVerifyTokenInput(e.target.value)}
              placeholder="Paste verification token"
              autoFocus
            />
            <div className="button-row center" style={{ marginTop: "16px" }}>
              <Button onClick={() => handleVerifyEmail(verifyTokenInput)} disabled={verifyingEmail || !verifyTokenInput.trim()}>
                {verifyingEmail ? <Loader2 className="spin" size={16} /> : "Verify Account"}
              </Button>
              <Button variant="outline" onClick={() => setVerifyModal(false)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}

function StatCard({ icon, label, value, hint }) {
  return (
    <Card className="stat-card">
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </Card>
  );
}

function CreateLink({ onCreated, setToast }) {
  const [form, setForm] = useState({ title: "", destinationUrl: "", vanitySlug: "", tag: "General" });
  const [busy, setBusy] = useState(false);

  function onSlugChange(value) {
    const cleaned = value
      .replace(/^https?:\/\/[^\/]+\/r\//i, "")
      .replace(/^\/?(r\/)?/i, "")
      .replace(/[^a-zA-Z0-9-]/g, "");
    setForm({ ...form, vanitySlug: cleaned });
  }

  function onUrlBlur() {
    if (form.destinationUrl && !/^https?:\/\//i.test(form.destinationUrl.trim())) {
      setForm((prev) => ({ ...prev, destinationUrl: `https://${form.destinationUrl.trim()}` }));
    }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      let dest = form.destinationUrl.trim();
      if (dest && !/^https?:\/\//i.test(dest)) {
        dest = `https://${dest}`;
      }
      await request("/api/links", { method: "POST", body: { ...form, destinationUrl: dest } });
      setForm({ title: "", destinationUrl: "", vanitySlug: "", tag: "General" });
      await onCreated();
      setToast("Short link created");
    } catch (error) {
      setToast(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="section-head compact">
        <div>
          <h2>Create Short Link</h2>
          <p>Auto-generate a 6 character code or use a custom vanity slug.</p>
        </div>
        <Plus size={20} />
      </div>
      <form onSubmit={submit} className="stack">
        <div className="two-col">
          <Input label="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Launch campaign" />
          <label className="field">
            <span>Category Tag</span>
            <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="category-select">
              <option value="General">General</option>
              <option value="Marketing">Marketing</option>
              <option value="Social">Social</option>
              <option value="Dev">Dev / Tech</option>
              <option value="Personal">Personal</option>
            </select>
          </label>
        </div>
        <Input
          label="Destination URL"
          value={form.destinationUrl}
          onChange={(event) => setForm({ ...form, destinationUrl: event.target.value })}
          onBlur={onUrlBlur}
          placeholder="https://example.com"
          required
        />
        <Input
          label="Custom slug"
          value={form.vanitySlug}
          onChange={(event) => onSlugChange(event.target.value)}
          placeholder="summer-sale"
        />
        <div className="slug-preview">
          <CheckCircle2 size={16} />
          <span>{form.vanitySlug ? `/r/${form.vanitySlug}` : "Leave blank for a unique 6-character code"}</span>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="spin" size={16} /> : <LinkIcon size={16} />} Create link
        </Button>
      </form>
    </Card>
  );
}

function Analytics({ analytics, links = [], selectedLink = "all", onSelectLink }) {
  const maxDaily = Math.max(1, ...(analytics?.clicksOverTime || []).map((item) => item.clicks));
  const activeLink = links.find((l) => l._id === selectedLink);

  return (
    <Card>
      <div className="section-head compact">
        <div>
          <h2>Click Analytics</h2>
          <p>{activeLink ? `Showing telemetry for /r/${activeLink.shortCode}` : "Aggregated click count, referrers and device distribution."}</p>
        </div>
        <div className="analytics-filter-wrap">
          <select
            className="analytics-select"
            aria-label="Filter analytics by link"
            value={selectedLink}
            onChange={(event) => onSelectLink && onSelectLink(event.target.value)}
          >
            <option value="all">All Links (Aggregate)</option>
            {links.map((link) => (
              <option key={link._id} value={link._id}>
                {link.title || link.shortCode} (/r/{link.shortCode})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="metric-row">
        <div>
          <span>Total clicks</span>
          <strong>{analytics?.totalClicks ?? 0}</strong>
        </div>
        <div>
          <span>Top referrer</span>
          <strong>{analytics?.topReferrers?.[0]?.referrer || "Direct"}</strong>
        </div>
      </div>
      <div className="bars">
        {(analytics?.clicksOverTime || []).map((item) => (
          <div key={item.date} className="bar-item">
            <span>{item.date.slice(5)}</span>
            <div><i style={{ width: `${(item.clicks / maxDaily) * 100}%` }} /></div>
            <b>{item.clicks}</b>
          </div>
        ))}
      </div>
      <div className="chips">
        {(analytics?.deviceDistribution || []).map((item) => (
          <Badge key={item.device}>{item.device}: {item.clicks}</Badge>
        ))}
      </div>
      <div className="referrer-list">
        {(analytics?.topReferrers || []).map((item) => (
          <div key={item.referrer}>
            <span>{item.referrer}</span>
            <strong>{item.clicks}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LinkTable({ links, pageInfo, setPage, onChanged, setToast, setQr, onSelectLink, onInspectLink }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", destinationUrl: "", vanitySlug: "", tag: "General" });

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      setToast("Copied short link");
    } catch {
      setToast("Failed to copy link");
    }
  }

  async function remove(id) {
    try {
      await request(`/api/links/${id}`, { method: "DELETE" });
      setToast("Link deleted");
      if (links.length === 1 && pageInfo.page > 1) {
        setPage((val) => Math.max(1, val - 1));
      } else {
        await onChanged();
      }
    } catch (error) {
      setToast(error.message || "Failed to delete link");
    }
  }

  async function showQr(link) {
    try {
      const data = await request(`/api/links/${link._id}/qr`);
      setQr({ title: link.title || link.shortCode, dataUrl: data.dataUrl, url: link.shortUrl });
    } catch (error) {
      setToast(error.message || "Failed to generate QR code");
    }
  }

  async function share(link) {
    const text = `${link.title || "Short link"}: ${link.shortUrl}`;
    if (navigator.share) {
      await navigator.share({ title: link.title || "ShortLink Hub", text, url: link.shortUrl }).catch(() => {});
    } else {
      await copy(link.shortUrl);
    }
  }

  function startEdit(link) {
    setEditingId(link._id);
    setEditForm({
      title: link.title || "",
      destinationUrl: link.destinationUrl,
      vanitySlug: link.shortCode,
      tag: link.tag || "General"
    });
  }

  async function saveEdit(id) {
    try {
      let dest = editForm.destinationUrl.trim();
      if (dest && !/^https?:\/\//i.test(dest)) {
        dest = `https://${dest}`;
      }
      await request(`/api/links/${id}`, { method: "PUT", body: { ...editForm, destinationUrl: dest } });
      setToast("Link updated");
      setEditingId(null);
      await onChanged();
    } catch (error) {
      setToast(error.message || "Failed to update link");
    }
  }

  if (!links.length) return <div className="empty">No links yet. Create your first branded short link.</div>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Destination & Category</th>
            <th>Short link</th>
            <th>Clicks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link._id}>
              <td>
                {editingId === link._id ? (
                  <div className="inline-edit">
                    <input aria-label="Link title" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} placeholder="Title" />
                    <input aria-label="Destination URL" value={editForm.destinationUrl} onChange={(event) => setEditForm({ ...editForm, destinationUrl: event.target.value })} placeholder="Destination URL" />
                    <select aria-label="Category tag" value={editForm.tag} onChange={(event) => setEditForm({ ...editForm, tag: event.target.value })} className="category-select-sm">
                      <option value="General">General</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Social">Social</option>
                      <option value="Dev">Dev / Tech</option>
                      <option value="Personal">Personal</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="link-title-row">
                      <strong>{link.title || "Untitled"}</strong>
                      <span className={`tag-chip tag-${(link.tag || "General").toLowerCase().replace(/[^a-z0-9]/g, "")}`}>
                        <Tag size={11} /> {link.tag || "General"}
                      </span>
                    </div>
                    <span className="dest-url" title={link.destinationUrl}>{link.destinationUrl}</span>
                  </>
                )}
              </td>
              <td>
                {editingId === link._id ? (
                  <input className="slug-edit" aria-label="Short slug" value={editForm.vanitySlug} onChange={(event) => setEditForm({ ...editForm, vanitySlug: event.target.value })} />
                ) : (
                  <code>{link.shortUrl}</code>
                )}
              </td>
              <td>
                <button
                  type="button"
                  className="clicks-btn"
                  title="Filter analytics for this link"
                  style={{ background: "transparent", border: 0, fontWeight: 700, color: "var(--blue)", cursor: "pointer" }}
                  onClick={() => onSelectLink && onSelectLink(link._id)}
                >
                  {link.clicks} clicks
                </button>
              </td>
              <td>
                <div className="icon-row">
                  {editingId === link._id ? (
                    <>
                      <Button variant="outline" title="Save edited link" onClick={() => saveEdit(link._id)}>Save</Button>
                      <Button variant="ghost" title="Cancel edit" onClick={() => setEditingId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="icon" title="Quick link details" onClick={() => onInspectLink && onInspectLink(link)}><Eye size={16} /></Button>
                      <Button variant="outline" size="icon" title="Edit link" onClick={() => startEdit(link)}><Pencil size={16} /></Button>
                      <Button variant="outline" size="icon" title="Copy short link" onClick={() => copy(link.shortUrl)}><Copy size={16} /></Button>
                      <Button variant="outline" size="icon" title="Share short link" onClick={() => share(link)}><Share2 size={16} /></Button>
                      <Button variant="outline" size="icon" title="Show QR code" onClick={() => showQr(link)}><QrCode size={16} /></Button>
                      <Button variant="outline" size="icon" title="Filter analytics" onClick={() => onSelectLink && onSelectLink(link._id)}><BarChart3 size={16} /></Button>
                      <Button variant="outline" size="icon" title="Open short link and track click" onClick={() => window.open(link.shortUrl, "_blank")}><TrendingUp size={16} /></Button>
                      <Button variant="outline" size="icon" title="Open destination" onClick={() => window.open(link.destinationUrl, "_blank")}><ExternalLink size={16} /></Button>
                      <Button variant="danger" size="icon" title="Delete link" onClick={() => remove(link._id)}><Trash2 size={16} /></Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        <span>{pageInfo.total} links - page {pageInfo.page} of {pageInfo.pages}</span>
        <div className="button-row">
          <Button variant="outline" disabled={pageInfo.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
          <Button variant="outline" disabled={pageInfo.page >= pageInfo.pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

function BioBuilder({ profile, onSaved, setToast }) {
  const [draft, setDraft] = useState(null);
  const [photoDetails, setPhotoDetails] = useState(null);

  useEffect(() => {
    if (profile) setDraft({ ...profile, socialLinks: profile.socialLinks?.length ? profile.socialLinks : defaultBioLinks });
  }, [profile]);

  if (!draft) return <Card><div className="empty">Loading bio customizer...</div></Card>;

  async function save() {
    try {
      const sanitizedLinks = (draft.socialLinks || []).map((item) => {
        let url = String(item.url || "").trim();
        if (url && !/^https?:\/\//i.test(url)) {
          url = `https://${url}`;
        }
        return { ...item, url };
      });

      await request("/api/bio/me", { method: "PUT", body: { ...draft, socialLinks: sanitizedLinks } });
      setToast("Bio page saved");
      await onSaved();
    } catch (error) {
      setToast(error.message);
    }
  }

  async function copyBioLink() {
    const url = `${window.location.origin}/bio/${draft.username}`;
    await navigator.clipboard.writeText(url);
    setToast("Bio page link copied");
  }

  function updateLink(index, key, value) {
    const socialLinks = draft.socialLinks.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    setDraft({ ...draft, socialLinks });
  }

  function removeLink(index) {
    const socialLinks = draft.socialLinks.filter((_item, i) => i !== index);
    setDraft({ ...draft, socialLinks });
  }

  function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("Please choose an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast("Photo must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDraft({ ...draft, avatar: reader.result });
      setPhotoDetails({
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        type: file.type
      });
      setToast("Profile photo ready. Click Save bio to publish it.");
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setDraft({ ...draft, avatar: "" });
    setPhotoDetails(null);
    setToast("Profile photo removed. Click Save bio to publish changes.");
  }

  return (
    <Card>
      <div className="section-head compact">
        <div>
          <h2>Bio Hub</h2>
          <p>Configure public mobile page at /bio/{draft.username}.</p>
        </div>
        <div className="button-row bio-actions">
          <Button variant="outline" onClick={copyBioLink}><Copy size={16} /> Copy</Button>
          <Button variant="outline" onClick={() => window.open(`/bio/${draft.username}`, "_blank")}><Eye size={16} /> Preview</Button>
        </div>
      </div>
      <div className="bio-builder-grid">
        <div className="stack">
          <div className="photo-uploader">
            <div className="avatar-preview-row">
              {draft.avatar ? <img src={draft.avatar} alt="Profile preview" /> : <div>{draft.displayName?.[0] || "U"}</div>}
              <span>
                <strong>Profile photo</strong>
                This photo appears on your public bio page and live preview.
              </span>
            </div>
            <div className="photo-controls">
              <label className="upload-button">
                <ImagePlus size={16} />
                Upload photo
                <input type="file" accept="image/*" onChange={uploadPhoto} />
              </label>
              <Button variant="outline" onClick={removePhoto}>Remove</Button>
            </div>
            {photoDetails && (
              <div className="photo-details">
                <span>{photoDetails.name}</span>
                <span>{photoDetails.size}</span>
                <span>{photoDetails.type}</span>
              </div>
            )}
            <Input label="Avatar URL" value={draft.avatar || ""} placeholder="Paste image URL or upload a photo above" onChange={(event) => setDraft({ ...draft, avatar: event.target.value, })} />
          </div>
          <Input label="Display name" value={draft.displayName || ""} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
          <Textarea label="Bio" value={draft.bio || ""} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} />
          <label className="field">
            <span>Theme</span>
            <select value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value })}>
              <option value="minimal-light">Minimal Light</option>
              <option value="dark-slate">Dark Slate</option>
              <option value="gradient">Gradient</option>
              <option value="cyber-neon">Cyber Neon</option>
            </select>
          </label>
          {draft.socialLinks.map((item, index) => (
            <div className="two-col link-row" key={index}>
              <Input label="Label" value={item.label} placeholder="GitHub" onChange={(event) => updateLink(index, "label", event.target.value)} />
              <Input label="URL" value={item.url} placeholder="https://github.com/yourname" onChange={(event) => updateLink(index, "url", event.target.value)} />
              <Button variant="danger" size="icon" title="Remove link" onClick={() => removeLink(index)}><Trash2 size={16} /></Button>
            </div>
          ))}
          <div className="button-row bio-save-row">
            <Button variant="outline" onClick={() => setDraft({ ...draft, socialLinks: [...draft.socialLinks, { label: "", url: "" }] })}>Add link</Button>
            <Button onClick={save}>Save bio</Button>
          </div>
        </div>
        <MiniBioPreview profile={draft} />
      </div>
    </Card>
  );
}

function MiniBioPreview({ profile }) {
  const links = (profile.socialLinks || []).filter((link) => link.label && link.url).slice(0, 4);

  return (
    <div className={`mini-phone ${profile.theme}`}>
      <div className="mini-phone-screen">
        <div className="mini-status" />
        {profile.avatar ? <img src={profile.avatar} alt="" /> : <div className="mini-avatar">{profile.displayName?.[0] || "U"}</div>}
        <h3>{profile.displayName || "Display name"}</h3>
        <p>{profile.bio || "Your short creator bio appears here."}</p>
        <div className="mini-links">
          {links.map((link, index) => {
            const href = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`;
            return (
              <a key={`${link.label}-${index}`} href={href} target="_blank" rel="noreferrer">
                {link.label}
                <ExternalLink size={13} />
              </a>
            );
          })}
        </div>
      </div>
      <div className="mini-phone-caption">
        <Palette size={16} /> Live mobile preview
      </div>
    </div>
  );
}

function PublicBio({ username }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    request(`/api/bio/public/${username}`)
      .then((data) => setProfile(data.profile))
      .catch((err) => setError(err.message));
  }, [username]);

  if (error) {
    return (
      <main className="bio-public minimal-light">
        <Card className="bio-404-card">
          <Badge>404 Not Found</Badge>
          <h1>Creator Profile Not Found</h1>
          <p>The bio hub for <code>@{username}</code> does not exist or has been renamed.</p>
          <Button onClick={() => (window.location.href = "/")}>Go to ShortLink Hub</Button>
        </Card>
      </main>
    );
  }

  if (!profile) return <ScreenLoader />;

  return (
    <main className={`bio-public ${profile.theme}`}>
      <section className="phone-page">
        {profile.avatar && <img src={profile.avatar} alt="" className="avatar" />}
        <h1>{profile.displayName}</h1>
        <p>{profile.bio}</p>
        <div className="bio-links">
          {profile.socialLinks.map((link) => {
            const href = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`;
            return (
              <a key={link._id || link.url} href={href} target="_blank" rel="noreferrer">
                {link.label}
                <ExternalLink size={16} />
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function QuickStatsModal({ link, onClose, onViewAnalytics, onCopy }) {
  if (!link) return null;
  const fullUrl = link.shortUrl;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <Card className="quick-stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="section-head compact">
          <div>
            <h2>{link.title || "Link Details"}</h2>
            <p>Quick snapshot & instant test redirect</p>
          </div>
          <span className={`tag-chip tag-${(link.tag || "General").toLowerCase().replace(/[^a-z0-9]/g, "")}`}>
            <Tag size={12} /> {link.tag || "General"}
          </span>
        </div>

        <div className="quick-modal-body">
          <div className="quick-modal-field">
            <label>Short Link</label>
            <div className="quick-url-box">
              <code>{fullUrl}</code>
              <Button variant="outline" size="sm" onClick={() => onCopy(fullUrl)}>
                <Copy size={14} /> Copy
              </Button>
            </div>
          </div>

          <div className="quick-modal-field">
            <label>Destination Target</label>
            <a href={link.destinationUrl} target="_blank" rel="noreferrer" className="quick-dest-link">
              {link.destinationUrl} <ExternalLink size={14} />
            </a>
          </div>

          <div className="quick-modal-stats-grid">
            <div className="quick-stat-box">
              <span>Total Clicks</span>
              <strong>{link.clicks}</strong>
            </div>
            <div className="quick-stat-box">
              <span>Created</span>
              <strong>{new Date(link.createdAt).toLocaleDateString()}</strong>
            </div>
          </div>
        </div>

        <div className="button-row center" style={{ marginTop: "20px" }}>
          <Button variant="outline" onClick={() => onViewAnalytics(link._id)}>
            <BarChart3 size={15} /> View Full Analytics
          </Button>
          <Button variant="outline" onClick={() => window.open(fullUrl, "_blank")}>
            <TrendingUp size={15} /> Test Redirect
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Card>
    </div>
  );
}

function QrModal({ qr, onClose }) {
  function downloadQr() {
    const anchor = document.createElement("a");
    anchor.href = qr.dataUrl;
    anchor.download = `${qr.title.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}-qr.png`;
    anchor.click();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <Card className="qr-modal" onClick={(event) => event.stopPropagation()}>
        <h2>{qr.title}</h2>
        <img src={qr.dataUrl} alt="QR code" />
        <code>{qr.url}</code>
        <div className="button-row center">
          <Button variant="outline" onClick={downloadQr}><Download size={16} /> Download</Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Card>
    </div>
  );
}

function ScreenLoader() {
  return (
    <main className="loader-screen">
      <Loader2 className="spin" />
      <span>Loading application</span>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
