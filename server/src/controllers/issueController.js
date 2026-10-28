import mongoose from 'mongoose';
import Issue from '../models/Issue.js';
import User from '../models/User.js';

const populated = (query) => query.populate('reporter', 'name email').populate('assignee', 'name email').populate('comments.author', 'name role');

function canView(issue, user) {
  return user.role === 'admin' || issue.reporter.equals(user._id) || issue.assignee?._id?.equals(user._id) || issue.assignee?.equals(user._id);
}

export async function listIssues(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = {};
  if (req.user.role === 'student') filter.reporter = req.user._id;
  if (req.user.role === 'staff') filter.assignee = req.user._id;
  if (['Open', 'In Progress', 'Resolved'].includes(req.query.status)) filter.status = req.query.status;
  if (['Electrical', 'Plumbing', 'Furniture', 'Cleaning', 'Other'].includes(req.query.category)) filter.category = req.query.category;
  const [items, total] = await Promise.all([
    populated(Issue.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)),
    Issue.countDocuments(filter)
  ]);
  res.json({ items, page, pages: Math.ceil(total / limit), total });
}

export async function createIssue(req, res) {
  const { title, description, category, location } = req.body;
  const allowed = ['Electrical', 'Plumbing', 'Furniture', 'Cleaning', 'Other'];
  if (typeof title !== 'string' || title.trim().length < 4 || title.length > 120 ||
      typeof description !== 'string' || description.trim().length < 10 || description.length > 3000 ||
      !allowed.includes(category) || typeof location !== 'string' || !location.trim() || location.length > 160) {
    return res.status(400).json({ message: 'Add a valid title, description, category, and location.' });
  }
  const issue = await Issue.create({ title, description, category, location, reporter: req.user._id });
  res.status(201).json({ item: await populated(Issue.findById(issue._id)) });
}

async function loadIssue(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return populated(Issue.findById(id));
}

export async function getIssue(req, res) {
  const issue = await loadIssue(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue not found.' });
  if (!canView(issue, req.user)) return res.status(403).json({ message: 'You cannot view this issue.' });
  res.json({ item: issue });
}

export async function updateStatus(req, res) {
  const issue = await loadIssue(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue not found.' });
  const assigned = issue.assignee?._id?.equals(req.user._id);
  if (req.user.role !== 'admin' && !(req.user.role === 'staff' && assigned)) return res.status(403).json({ message: 'Only assigned staff or an admin can update status.' });
  const { status, message = '' } = req.body;
  if (!['Open', 'In Progress', 'Resolved'].includes(status) || typeof message !== 'string' || message.length > 1000) return res.status(400).json({ message: 'Choose a valid status and a comment under 1000 characters.' });
  issue.status = status;
  if (message.trim()) issue.comments.push({ author: req.user._id, message: message.trim() });
  await issue.save();
  res.json({ item: await populated(Issue.findById(issue._id)) });
}

export async function assignIssue(req, res) {
  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue not found.' });
  const { staffId } = req.body;
  if (!mongoose.isValidObjectId(staffId) || !await User.exists({ _id: staffId, role: 'staff' })) return res.status(400).json({ message: 'Choose a valid staff account.' });
  issue.assignee = staffId;
  await issue.save();
  res.json({ item: await populated(Issue.findById(issue._id)) });
}

export async function addComment(req, res) {
  const issue = await loadIssue(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue not found.' });
  if (!canView(issue, req.user) && !(req.user.role === 'staff' || req.user.role === 'admin')) return res.status(403).json({ message: 'You cannot comment on this issue.' });
  const { message } = req.body;
  if (typeof message !== 'string' || !message.trim() || message.length > 1000) return res.status(400).json({ message: 'Enter a comment under 1000 characters.' });
  issue.comments.push({ author: req.user._id, message: message.trim() });
  await issue.save();
  res.status(201).json({ item: await populated(Issue.findById(issue._id)) });
}

export async function deleteIssue(req, res) {
  const issue = await Issue.findByIdAndDelete(req.params.id);
  if (!issue) return res.status(404).json({ message: 'Issue not found.' });
  res.status(204).end();
}

export async function listStaff(req, res) {
  const staff = await User.find({ role: 'staff' }).select('name email');
  res.json({ items: staff });
}
