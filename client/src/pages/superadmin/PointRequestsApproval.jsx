import React, { useState } from 'react';
import { useGetPointRequestsQuery, useReviewPointRequestMutation } from '../../store/apiSlice';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { GitPullRequest, CheckCircle2, XCircle, AlertCircle, MessageSquare } from 'lucide-react';

export default function PointRequestsApproval() {
  const { data: requests = [], isLoading, refetch } = useGetPointRequestsQuery();
  const [reviewRequest, { isLoading: isReviewing }] = useReviewPointRequestMutation();

  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [reviewModal, setReviewModal] = useState({ isOpen: false, req: null, action: 'APPROVED', approvedAmount: '', comment: '' });
  const [error, setError] = useState('');

  const filteredRequests = requests.filter(r => {
    return filterStatus === 'ALL' || r.status === filterStatus;
  });

  const openReviewModal = (req, action) => {
    setError('');
    setReviewModal({
      isOpen: true,
      req,
      action,
      approvedAmount: action === 'PARTIALLY_APPROVED' ? String(Math.floor(req.requestedAmount / 2)) : String(req.requestedAmount),
      comment: ''
    });
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await reviewRequest({
        id: reviewModal.req.id,
        status: reviewModal.action,
        approvedAmount: reviewModal.action === 'PARTIALLY_APPROVED' ? parseInt(reviewModal.approvedAmount, 10) : reviewModal.req.requestedAmount,
        reviewerComment: reviewModal.comment
      }).unwrap();

      setReviewModal({ isOpen: false, req: null, action: 'APPROVED', approvedAmount: '', comment: '' });
      refetch();
    } catch (err) {
      setError(err?.data?.error || 'Review submission failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-cyan-400" />
            <span>Point Request Approvals</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Review, approve, partially approve, or reject point requests from Admins</p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-xl border border-slate-700 overflow-x-auto max-w-full">
          {['PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Request Code</th>
                <th className="py-3.5 px-4">Admin Requester</th>
                <th className="py-3.5 px-4 text-right">Requested Amount</th>
                <th className="py-3.5 px-4 text-right">Approved Amount</th>
                <th className="py-3.5 px-4">Reason & Note</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">Loading requests...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">No requests found under this filter.</td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {req.requestCode}
                      <p className="text-[10px] text-slate-400 font-sans font-normal">
                        {new Date(req.createdAt).toLocaleString()}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-indigo-300">@{req.adminUsername}</p>
                      <p className="text-[11px] text-slate-400">{req.adminName}</p>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                      ${req.requestedAmount.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {req.status === 'PENDING' ? '-' : `$${(req.approvedAmount || 0).toLocaleString()}`}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-white font-medium truncate">{req.reason}</p>
                      {req.note && <p className="text-[11px] text-slate-400 italic truncate">{req.note}</p>}
                      {req.reviewerComment && (
                        <p className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>Reviewer: {req.reviewerComment}</span>
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={req.status} />
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => openReviewModal(req, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openReviewModal(req, 'PARTIALLY_APPROVED')}
                            className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Partial
                          </button>
                          <button
                            onClick={() => openReviewModal(req, 'REJECTED')}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REVIEW MODAL */}
      <Modal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal({ isOpen: false, req: null, action: 'APPROVED', approvedAmount: '', comment: '' })}
        title={`Review Request ${reviewModal.req?.requestCode}`}
      >
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-1 text-xs">
            <p className="text-slate-400">Admin Requester: <span className="text-white font-semibold">@{reviewModal.req?.adminUsername}</span></p>
            <p className="text-slate-400">Requested Amount: <span className="text-amber-400 font-bold font-mono">${(reviewModal.req?.requestedAmount || 0).toLocaleString()}</span></p>
            <p className="text-slate-400">Reason: <span className="text-white">{reviewModal.req?.reason}</span></p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Decision Action</label>
            <select
              value={reviewModal.action}
              onChange={(e) => setReviewModal({ ...reviewModal, action: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
            >
              <option value="APPROVED">Approve Full Amount (${(reviewModal.req?.requestedAmount || 0).toLocaleString()})</option>
              <option value="PARTIALLY_APPROVED">Approve Partial Amount</option>
              <option value="REJECTED">Reject Request</option>
            </select>
          </div>

          {reviewModal.action === 'PARTIALLY_APPROVED' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Partial Approved Amount (Integer) *</label>
              <input
                type="number"
                min="1"
                max={(reviewModal.req?.requestedAmount || 1) - 1}
                required
                value={reviewModal.approvedAmount}
                onChange={(e) => setReviewModal({ ...reviewModal, approvedAmount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Super Admin Comment / Note</label>
            <textarea
              rows="2"
              value={reviewModal.comment}
              onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
              placeholder="e.g. Approved based on Q4 allocation criteria"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setReviewModal({ isOpen: false, req: null, action: 'APPROVED', approvedAmount: '', comment: '' })}
              className="px-4 py-2 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReviewing}
              className={`px-4 py-2 text-xs text-white rounded-lg font-semibold ${
                reviewModal.action === 'REJECTED'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {isReviewing ? 'Submitting...' : 'Confirm Decision'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
