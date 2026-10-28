import { Router } from 'express';
import { addComment, assignIssue, createIssue, deleteIssue, getIssue, listIssues, listStaff, updateStatus } from '../controllers/issueController.js';
import { allowRoles, requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/staff', allowRoles('admin'), listStaff);
router.get('/', listIssues);
router.post('/', allowRoles('student'), createIssue);
router.get('/:id', getIssue);
router.patch('/:id/status', allowRoles('staff', 'admin'), updateStatus);
router.patch('/:id/assign', allowRoles('admin'), assignIssue);
router.post('/:id/comments', addComment);
router.delete('/:id', allowRoles('admin'), deleteIssue);
export default router;
