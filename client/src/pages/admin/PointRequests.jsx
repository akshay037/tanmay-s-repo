import React, { useState } from 'react';
import { useGetPointRequestsQuery, useRequestPointsMutation } from '../../store/apiSlice';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { GitPullRequest, Plus, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PointRequests() {
  const { data: requests = [], isLoading, refetch } = useGetPointRequestsQuery();
  const [requestPoints, { isLoading: isSubmitting }] = useRequestPointsMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestedAmount, setRequestedAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const numAmount = parseInt(requestedAmount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Requested amount must be a positive integer.');
      return;
    }

    try {
      const res = await requestPoints({
        requestedAmount: numAmount,
        reason,
        note
      }).unwrap();

      setSuccess(res.message);
      setIsModalOpen(false);
      setRequestedAmount('');
      setReason('');
      setNote('');
      refetch();
    } catch (err) {
      setError(err?.data?.error || 'Failed to submit point request.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-cyan-400" />
            <span>Point Requests</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Request additional points from Super Admin for user allocation</p>
        </div>

        <button
          onClick={() => { setError(''); setSuccess(''); setIsModalOpen(true); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Point Request</span>
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Request Code</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Requested</th>
                <th className="py-3.5 px-4 text-right">Approved</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Super Admin Comment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">Loading your requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">You have not submitted any point requests yet.</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {req.requestCode}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(req.createdAt).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                      ${req.requestedAmount.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {req.status === 'PENDING' ? '-' : `$${(req.approvedAmount || 0).toLocaleString()}`}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-medium text-white truncate">{req.reason}</p>
                      {req.note && <p className="text-[11px] text-slate-400 italic truncate">{req.note}</p>}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={req.status} />
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 italic">
                      {req.reviewerComment ? (
                        <span className="flex items-center gap-1.5 text-cyan-300">
                          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{req.reviewerComment}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW REQUEST MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit New Point Request">
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Requested Points (Integer) *</label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Request *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. New users added for project campaign"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Optional Note</label>
            <textarea
              rows="2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional details for Super Admin review..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
