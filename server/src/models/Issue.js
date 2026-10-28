import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
});

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 4, maxlength: 120 },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
  category: { type: String, enum: ['Electrical', 'Plumbing', 'Furniture', 'Cleaning', 'Other'], required: true },
  location: { type: String, required: true, trim: true, maxlength: 160 },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  comments: { type: [commentSchema], default: [] }
}, { timestamps: true });

issueSchema.index({ status: 1, category: 1, createdAt: -1 });
export default mongoose.model('Issue', issueSchema);
