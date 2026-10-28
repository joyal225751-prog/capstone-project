import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './services/api.js';

const categories = ['Electrical', 'Plumbing', 'Furniture', 'Cleaning', 'Other'];
const statuses = ['Open', 'In Progress', 'Resolved'];

function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('campusfix-session')); } catch { return null; }
  });
  const [mode, setMode] = useState('login');
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formBusy, setFormBusy] = useState(false);

  const user = session?.user;
  const token = session?.token;
  const canCreate = user?.role === 'student';
  const isAdmin = user?.role === 'admin';

  const signOut = () => {
    localStorage.removeItem('campusfix-session');
    setSession(null); setItems([]); setSelected(null);
  };

  const loadIssues = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ page: String(page), limit: '8' });
      if (filters.status) query.set('status', filters.status);
      if (filters.category) query.set('category', filters.category);
      const data = await api(`/issues?${query}`, { token });
      setItems(data.items); setPages(Math.max(1, data.pages));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token, page, filters, refresh]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  useEffect(() => {
    if (!isAdmin) { setStaff([]); return; }
    api('/issues/staff', { token }).then(data => setStaff(data.items)).catch(err => setError(err.message));
  }, [isAdmin, token]);

  const counts = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.status !== 'Resolved').length,
    resolved: items.filter(i => i.status === 'Resolved').length
  }), [items]);

  const handleAuth = async (event) => {
    event.preventDefault(); setFormBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const data = await api(`/auth/${mode === 'register' ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(body) });
      const next = { token: data.token, user: data.user };
      localStorage.setItem('campusfix-session', JSON.stringify(next)); setSession(next);
    } catch (err) { setError(err.message); }
    finally { setFormBusy(false); }
  };

  const createIssue = async (event) => {
    event.preventDefault(); setFormBusy(true); setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api('/issues', { method: 'POST', token, body: JSON.stringify(body) });
      event.currentTarget.reset(); setNotice('Your report has been submitted.'); setRefresh(v => v + 1);
    } catch (err) { setError(err.message); }
    finally { setFormBusy(false); }
  };

  const openIssue = async (id) => {
    setError('');
    try { const data = await api(`/issues/${id}`, { token }); setSelected(data.item); }
    catch (err) { setError(err.message); }
  };

  const changeStatus = async (event, issue) => {
    event.preventDefault(); setFormBusy(true); setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const data = await api(`/issues/${issue._id}/status`, { method: 'PATCH', token, body: JSON.stringify(body) });
      setSelected(data.item); setRefresh(v => v + 1); setNotice('Issue status updated.');
    } catch (err) { setError(err.message); }
    finally { setFormBusy(false); }
  };

  const assignStaff = async (event, issue) => {
    const staffId = event.target.value;
    if (!staffId) return;
    try {
      const data = await api(`/issues/${issue._id}/assign`, { method: 'PATCH', token, body: JSON.stringify({ staffId }) });
      setItems(current => current.map(item => item._id === issue._id ? data.item : item));
      if (selected?._id === issue._id) setSelected(data.item);
      setNotice('Staff member assigned.');
    } catch (err) { setError(err.message); }
  };

  if (!session) return <main className="auth-shell">
    <section className="auth-card">
      <Brand />
      <p className="eyebrow">A better campus starts with being heard</p>
      <h1>{mode === 'login' ? 'Welcome back.' : 'Join your campus.'}</h1>
      <p className="muted">Report a problem, follow the progress, and help make campus work better for everyone.</p>
      {error && <div className="alert error" role="alert">{error}</div>}
      <form onSubmit={handleAuth} className="stack">
        {mode === 'register' && <Field label="Your name" name="name" placeholder="e.g. Sam Taylor" required minLength="2" maxLength="80" />}
        <Field label="Email address" name="email" type="email" placeholder="you@campus.edu" required />
        <Field label="Password" name="password" type="password" placeholder="At least 8 characters" required minLength="8" />
        <button className="button primary full" disabled={formBusy}>{formBusy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create student account'} <span aria-hidden="true">↗</span></button>
      </form>
      <p className="switch-auth">{mode === 'login' ? 'New to CampusFix?' : 'Already have an account?'} <button className="link-button" onClick={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}>{mode === 'login' ? 'Create an account' : 'Log in'}</button></p>
      <p className="fine-print">CampusFix accounts are student accounts by default. Staff and admin access is provisioned by your project administrator.</p>
    </section>
    <aside className="auth-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-sticker">CAMPUS<br/>CARE<br/><span>IN PROGRESS</span></div><div className="art-note">Small fixes<br/>make a big<br/>difference <b>✳</b></div><div className="art-footer"><span>NOTICE SOMETHING?</span><span>LET'S FIX IT TOGETHER&nbsp; ↗</span></div></aside>
  </main>;

  return <div className="app-shell">
    <header className="topbar"><Brand /><div className="top-actions"><span className="campus-tag"><span className="online-dot"/> CAMPUS OPERATIONS</span><div className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</div><div className="user-label"><strong>{user.name}</strong><span>{user.role}</span></div><button className="icon-button" onClick={signOut} aria-label="Log out" title="Log out">↗</button></div></header>
    <main className="dashboard">
      <section className="welcome-row"><div><p className="eyebrow">CAMPUS ISSUE DESK <span className="date-chip">LIVE</span></p><h1>Good to see you, {user.name.split(' ')[0]}<span className="wave">✳</span></h1><p className="muted">A clear path from “something's wrong” to “it's taken care of.”</p></div><div className="today-note"><span>YOUR ROLE</span><strong>{user.role}</strong><small>CampusFix workspace</small></div></section>
      <section className="stat-grid" aria-label="Issue overview"><Stat label="VISIBLE REPORTS" value={counts.total} tone="dark" icon="▤"/><Stat label="NEEDS ATTENTION" value={counts.active} tone="orange" icon="◷"/><Stat label="RESOLVED" value={counts.resolved} tone="green" icon="✓"/></section>
      <div className="content-grid">
        <section className="panel issue-panel">
          <div className="panel-heading"><div><p className="eyebrow">THE WORKBOARD</p><h2>{isAdmin ? 'All campus reports' : user.role === 'staff' ? 'Your assigned reports' : 'Your reports'} <span className="count-pill">{items.length}</span></h2></div><div className="filters"><label className="sr-only" htmlFor="filter-status">Filter by status</label><select id="filter-status" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}><option value="">All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}</select><label className="sr-only" htmlFor="filter-category">Filter by category</label><select id="filter-category" value={filters.category} onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}><option value="">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div></div>
          {error && <div className="alert error" role="alert">{error}<button className="dismiss" onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
          {notice && <div className="alert success" role="status">{notice}<button className="dismiss" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
          {loading ? <div className="state-box"><span className="spinner"/> Loading reports…</div> : items.length === 0 ? <div className="state-box empty-state"><span className="empty-icon">✳</span><strong>No reports here yet</strong><span>{filters.status || filters.category ? 'Try changing the filters.' : canCreate ? 'When you spot something, submit the first report.' : 'Assigned work will show here.'}</span></div> : <div className="issue-list">{items.map(issue => <IssueRow key={issue._id} issue={issue} onClick={() => openIssue(issue._id)} isAdmin={isAdmin} staff={staff} onAssign={assignStaff}/>)}</div>}
          <div className="pagination"><span>Page {page} of {pages}</span><div><button className="page-button" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>← Previous</button><button className="page-button" disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)}>Next →</button></div></div>
        </section>
        <aside className="side-column">
          {canCreate ? <section className="panel report-panel"><div className="panel-heading compact"><div><p className="eyebrow">MAKE IT BETTER</p><h2>Report an issue <span className="spark">✳</span></h2></div></div><p className="muted small">Tell us what needs attention. The right people will take it from here.</p><form className="stack form-stack" onSubmit={createIssue}><Field label="What needs fixing?" name="title" placeholder="e.g. Light out in north hall" required minLength="4" maxLength="120"/><div className="field-row"><label className="field"><span>Category</span><select name="category" required defaultValue=""><option value="" disabled>Select one</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label><Field label="Where on campus?" name="location" placeholder="Building & area" required maxLength="160"/></div><label className="field"><span>Tell us a little more</span><textarea name="description" placeholder="What happened? Add anything that helps the team find it." required minLength="10" maxLength="3000" rows="4"/></label><button className="button primary full" disabled={formBusy}>{formBusy ? 'Sending…' : 'Submit report'} <span>↗</span></button><p className="form-footnote">Please don’t include private or sensitive personal information.</p></form></section> : <section className="panel tip-panel"><div className="tip-icon">✳</div><p className="eyebrow">GOOD TO KNOW</p><h2>{isAdmin ? 'Every report has a path.' : 'You’re part of the fix.'}</h2><p className="muted">{isAdmin ? 'Assign each new report to a facilities team member so progress stays visible.' : 'Updates stay attached to the report, so the next person has the context they need.'}</p><div className="tip-rule"/><span className="micro-label">CAMPUSFIX FIELD NOTE&nbsp; № 01</span></section>}
          <section className="help-card"><div><strong>Small issue or big?</strong><p>For urgent safety emergencies, contact campus security directly.</p></div><span aria-hidden="true">↗</span></section>
        </aside>
      </div>
      <footer className="footer"><span>© CAMPUSFIX · CAMPUS CARE, IN PROGRESS</span><span>MADE FOR A BETTER EVERYDAY&nbsp; ✳</span></footer>
    </main>
    {selected && <IssueModal issue={selected} user={user} onClose={() => setSelected(null)} onStatus={changeStatus} busy={formBusy} onRefresh={() => { setRefresh(v => v + 1); openIssue(selected._id); }} />}
  </div>;
}

function Brand() { return <a className="brand" href="#" aria-label="CampusFix home"><span className="brand-mark">c<span>✳</span></span><span>campusfix<small>ISSUE DESK</small></span></a>; }
function Field({ label, ...props }) { return <label className="field"><span>{label}</span><input {...props}/></label>; }
function Stat({ label, value, tone, icon }) { return <div className={`stat-card ${tone}`}><div><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span></div><strong>{value.toString().padStart(2, '0')}</strong><span className="stat-bottom">{tone === 'orange' ? 'OPEN LOOP' : tone === 'green' ? 'CLOSED LOOP' : 'ON YOUR BOARD'}</span></div>; }
function IssueRow({ issue, onClick, isAdmin, staff, onAssign }) {
  return <article className="issue-row"><button className="issue-main" onClick={onClick}><span className={`category-icon ${issue.category.toLowerCase()}`}>{issue.category === 'Electrical' ? 'ϟ' : issue.category === 'Plumbing' ? '≈' : issue.category === 'Furniture' ? '▦' : issue.category === 'Cleaning' ? '✧' : '✳'}</span><span className="issue-copy"><span className="issue-title">{issue.title}</span><span className="issue-meta">{issue.location} <i>·</i> {issue.category} <i>·</i> {new Date(issue.createdAt).toLocaleDateString()}</span></span></button><div className="row-actions">{isAdmin && <label className="sr-only" htmlFor={`assign-${issue._id}`}>Assign {issue.title}</label>}{isAdmin && <select id={`assign-${issue._id}`} className="assign-select" value={issue.assignee?._id || ''} onChange={e => onAssign(e, issue)}><option value="">Assign staff</option>{staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select>}<Status status={issue.status}/><button className="row-arrow" aria-label={`View ${issue.title}`} onClick={onClick}>↗</button></div></article>;
}
function Status({ status }) { return <span className={`status status-${status.toLowerCase().replace(' ', '-')}`}><i/> {status}</span>; }
function IssueModal({ issue, user, onClose, onStatus, busy, onRefresh }) {
  const canUpdate = user.role === 'admin' || (user.role === 'staff' && issue.assignee?._id === user.id);
  const canComment = user.role === 'admin' || user.role === 'staff' || issue.reporter?._id === user.id;
  const [comment, setComment] = useState(''); const [commentError, setCommentError] = useState('');
  const addComment = async (event) => {
    event.preventDefault(); setCommentError('');
    try { await api(`/issues/${issue._id}/comments`, { method: 'POST', token: JSON.parse(localStorage.getItem('campusfix-session'))?.token, body: JSON.stringify({ message: comment }) }); setComment(''); onRefresh(); }
    catch (err) { setCommentError(err.message); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><span className="eyebrow">REPORT DETAILS</span><button className="icon-button close-button" onClick={onClose} aria-label="Close details">×</button></div><h2 id="modal-title">{issue.title}</h2><div className="modal-meta"><Status status={issue.status}/><span>{issue.category}</span><span>{issue.location}</span></div><p className="modal-description">{issue.description}</p><div className="people-line"><span>REPORTED BY <b>{issue.reporter?.name || 'Student'}</b></span><span>ASSIGNED TO <b>{issue.assignee?.name || 'Not assigned'}</b></span></div>
    {canUpdate && <form className="status-form" onSubmit={e => onStatus(e, issue)}><label className="field"><span>Update status</span><select name="status" defaultValue={issue.status}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label className="field"><span>Progress note (optional)</span><input name="message" placeholder="Add an update for the student" maxLength="1000"/></label><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save update'}</button></form>}
    <div className="comments"><p className="eyebrow">UPDATES & NOTES <span className="count-pill">{issue.comments?.length || 0}</span></p>{issue.comments?.length ? issue.comments.map((c, i) => <div className="comment" key={c._id || i}><span className="comment-avatar">{c.author?.name?.slice(0, 1) || 'C'}</span><div><strong>{c.author?.name || 'CampusFix user'} <small>{c.author?.role}</small></strong><p>{c.message}</p><time>{new Date(c.createdAt).toLocaleString()}</time></div></div>) : <p className="muted small">No updates yet.</p>}{canComment && <form className="comment-form" onSubmit={addComment}><label className="sr-only" htmlFor="new-comment">Add a note</label><input id="new-comment" value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a helpful note…" maxLength="1000" required/><button className="button secondary" disabled={!comment.trim()}>Post</button></form>}{commentError && <p className="inline-error">{commentError}</p>}</div></section></div>;
}

export default App;
