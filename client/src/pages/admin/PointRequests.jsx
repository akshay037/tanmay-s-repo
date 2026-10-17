import React, { useState, useEffect } from 'react';
import {
  useGetPointRequestsQuery,
  useRequestPointsMutation,
  useGetUserWithdrawalRequestsQuery,
  useReviewUserWithdrawalRequestMutation
} from '../../store/apiSlice';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import {
  GitPullRequest,
  Plus,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpFromLine,
  Coins,
  Search,
  Filter,
  Check,
  X,
  Clock,
  User,
  ShieldCheck,
  Wallet
} from 'lucide-react';

export default function PointRequests({ initialTab = 'user-withdrawals' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'user-withdrawals' | 'admin-requests'

  // Admin's own requests to Super Admin
  const { data: adminRequests = [], isLoading: isLoadingAdminReqs, refetch: refetchAdminReqs } = useGetPointRequestsQuery();
  const [requestPoints, { isLoading: isSubmittingAdminReq }] = useRequestPointsMutation();

  // User withdrawal requests to this Admin
  const { data: userWithdrawals = [], isLoading: isLoadingWithdrawals, refetch: refetchWithdrawals } = useGetUserWithdrawalRequestsQuery();
  const [reviewWithdrawal, { isLoading: isReviewingWithdrawal }] = useReviewUserWithdrawalRequestMutation();

  // Filters for User Withdrawals
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState('ALL');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');

  // Review Modal state for User Withdrawal
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    item: null,
    action: 'APPROVED', // 'APPROVED' | 'REJECTED'
    adminNote: '',
    error: ''
  });

  // Admin New Request Modal state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminRequestedAmount, setAdminRequestedAmount] = useState('');
  const [adminReason, setAdminReason] = useState('');
  const [adminNote, setAdminNote] = useState('');

  const [feedback, setFeedback] = useState({ error: '', success: '' });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const pendingWithdrawalsCount = userWithdrawals.filter(w => w.status === 'PENDING').length;
  const pendingAdminReqsCount = adminRequests.filter(r => r.status === 'PENDING').length;

  // Filtered User Withdrawals
  const filteredWithdrawals = userWithdrawals.filter((w) => {
    const matchesStatus = withdrawalStatusFilter === 'ALL' || w.status === withdrawalStatusFilter;
    const q = withdrawalSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      w.requestCode?.toLowerCase().includes(q) ||
      w.username?.toLowerCase().includes(q) ||
      w.fullName?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // Handle Admin Request to Super Admin
  const handleAdminRequestSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ error: '', success: '' });

    const numAmount = parseInt(adminRequestedAmount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFeedback({ error: 'Requested amount must be a positive integer.', success: '' });
      return;
    }

    try {
      const res = await requestPoints({
        requestedAmount: numAmount,
        reason: adminReason,
        note: adminNote
      }).unwrap();

      setFeedback({ error: '', success: res.message || 'Point request submitted to Super Admin.' });
      setIsAdminModalOpen(false);
      setAdminRequestedAmount('');
      setAdminReason('');
      setAdminNote('');
      refetchAdminReqs();
    } catch (err) {
      setFeedback({ error: err?.data?.error || 'Failed to submit point request.', success: '' });
    }
  };

  // Open Review Modal for a User Withdrawal
  const openReviewModal = (item, action) => {
    setReviewModal({
      isOpen: true,
      item,
      action,
      adminNote: '',
      error: ''
    });
  };

  // Handle Review Submission (Approve / Reject)
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModal.item) return;

    try {
      const res = await reviewWithdrawal({
        id: reviewModal.item.id,
        status: reviewModal.action,
        adminNote: reviewModal.adminNote
      }).unwrap();

      setReviewModal({ isOpen: false, item: null, action: 'APPROVED', adminNote: '', error: '' });
      setFeedback({
        error: '',
        success: res.message || `Withdrawal request marked as ${reviewModal.action}.`
      });
      refetchWithdrawals();
    } catch (err) {
      setReviewModal(prev => ({ ...prev, error: err?.data?.error || 'Failed to review withdrawal request.' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <GitPullRequest className="w-6 h-6 text-red-600" />
            <span>Point & Withdrawal Requests</span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Review user withdrawal requests from Telegram & request points from Super Admin
          </p>
        </div>

        {activeTab === 'admin-requests' && (
          <button
            onClick={() => {
              setFeedback({ error: '', success: '' });
              setIsAdminModalOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black rounded-xl flex items-center space-x-1.5 shadow-md shadow-red-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>New Request to Super Admin</span>
          </button>
        )}
      </div>

      {/* Primary Tabs */}
      <div className="flex items-center space-x-2 border-b-2 border-red-100 pb-2">
        <button
          onClick={() => setActiveTab('user-withdrawals')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'user-withdrawals'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-red-200'
          }`}
        >
          <ArrowUpFromLine className="w-4 h-4" />
          <span>User Withdrawal Requests</span>
          {pendingWithdrawalsCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'user-withdrawals' ? 'bg-white text-red-700' : 'bg-red-600 text-white'
            }`}>
              {pendingWithdrawalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('admin-requests')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'admin-requests'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-red-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>My Requests to Super Admin</span>
          {pendingAdminReqsCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'admin-requests' ? 'bg-white text-red-700' : 'bg-amber-500 text-white'
            }`}>
              {pendingAdminReqsCount}
            </span>
          )}
        </button>
      </div>

      {/* Global Alerts */}
      {feedback.success && (
        <div className="p-3.5 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center space-x-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback.success}</span>
        </div>
      )}
      {feedback.error && (
        <div className="p-3.5 bg-red-50 border-2 border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center space-x-2 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{feedback.error}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: USER WITHDRAWAL REQUESTS                           */}
      {/* ========================================================= */}
      {activeTab === 'user-withdrawals' && (
        <div className="space-y-5">
          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border-2 border-red-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={withdrawalSearch}
                onChange={(e) => setWithdrawalSearch(e.target.value)}
                placeholder="Search user, @username, or request code..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
              {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((st) => (
                <button
                  key={st}
                  onClick={() => setWithdrawalStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                    withdrawalStatusFilter === st
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* User Withdrawals Table */}
          <div className="bg-white border-2 border-red-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-50/60 border-b-2 border-red-100 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Request Code</th>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4 text-right">User Balance</th>
                    <th className="py-3.5 px-4 text-right">Requested Withdrawal</th>
                    <th className="py-3.5 px-4">Date & Payout Note</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50 text-xs text-slate-700">
                  {isLoadingWithdrawals ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                        Loading user withdrawal requests...
                      </td>
                    </tr>
                  ) : filteredWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                        No user withdrawal requests found under filter.
                      </td>
                    </tr>
                  ) : (
                    filteredWithdrawals.map((req) => {
                      const hasSufficientBalance = req.userCurrentBalance >= req.amount;
                      return (
                        <tr key={req.id} className="hover:bg-red-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                            {req.requestCode}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-black text-xs shrink-0">
                                {req.username?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-black text-slate-900">{req.fullName || req.username}</p>
                                <p className="text-[11px] font-semibold text-red-700">@{req.username}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            <span className={hasSufficientBalance ? 'text-emerald-700' : 'text-rose-600'}>
                              ${req.userCurrentBalance.toLocaleString()}
                            </span>
                            {!hasSufficientBalance && req.status === 'PENDING' && (
                              <p className="text-[10px] text-rose-500 font-bold">Insufficient</p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-black text-red-700 text-sm">
                            ${req.amount.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-[11px] text-slate-400 font-semibold">
                              {new Date(req.createdAt).toLocaleString()}
                            </p>
                            {req.userNote ? (
                              <p className="text-[11px] text-slate-700 font-medium italic mt-0.5 truncate" title={req.userNote}>
                                📝 {req.userNote}
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge status={req.status} />
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {req.status === 'PENDING' ? (
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => openReviewModal(req, 'APPROVED')}
                                  disabled={!hasSufficientBalance}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center space-x-1 shadow-sm transition-all ${
                                    hasSufficientBalance
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105'
                                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  }`}
                                  title={hasSufficientBalance ? 'Approve Withdrawal & Deduct Points' : 'User balance insufficient'}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>

                                <button
                                  onClick={() => openReviewModal(req, 'REJECTED')}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-black flex items-center space-x-1 transition-all"
                                  title="Reject Withdrawal Request"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-500">
                                <p className="font-semibold text-slate-700">Reviewed</p>
                                {req.adminNote && (
                                  <p className="italic text-slate-500 truncate max-w-[140px]" title={req.adminNote}>
                                    "{req.adminNote}"
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ADMIN'S POINT REQUESTS TO SUPER ADMIN              */}
      {/* ========================================================= */}
      {activeTab === 'admin-requests' && (
        <div className="bg-white border-2 border-red-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-red-50/60 border-b-2 border-red-100 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Request Code</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Requested</th>
                  <th className="py-3.5 px-4 text-right">Approved</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Super Admin Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50 text-xs text-slate-700">
                {isLoadingAdminReqs ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                      Loading your requests...
                    </td>
                  </tr>
                ) : adminRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                      You have not submitted any point requests to Super Admin yet.
                    </td>
                  </tr>
                ) : (
                  adminRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-red-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                        {req.requestCode}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px] font-medium">
                        {new Date(req.createdAt).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-red-700">
                        ${req.requestedAmount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700">
                        {req.status === 'PENDING' ? '-' : `$${(req.approvedAmount || 0).toLocaleString()}`}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 truncate">{req.reason}</p>
                        {req.note && <p className="text-[11px] text-slate-500 italic truncate">{req.note}</p>}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge status={req.status} />
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 italic">
                        {req.reviewerComment ? (
                          <span className="flex items-center gap-1.5 text-slate-800">
                            <MessageSquare className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                            <span>{req.reviewerComment}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REVIEW USER WITHDRAWAL MODAL                              */}
      {/* ========================================================= */}
      <Modal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
        title={reviewModal.action === 'APPROVED' ? 'Approve User Withdrawal' : 'Reject User Withdrawal'}
      >
        {reviewModal.error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 text-xs font-bold rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{reviewModal.error}</span>
          </div>
        )}

        {reviewModal.item && (
          <form onSubmit={handleReviewSubmit} className="space-y-4 text-slate-800">
            {/* Summary Box */}
            <div className="p-4 bg-red-50/70 border-2 border-red-200 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Request Code:</span>
                <span className="font-mono font-black text-slate-900">{reviewModal.item.requestCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">User:</span>
                <span className="font-black text-slate-900">@{reviewModal.item.username} ({reviewModal.item.fullName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">User Available Balance:</span>
                <span className="font-mono font-bold text-emerald-700">${reviewModal.item.userCurrentBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-red-200 pt-2">
                <span className="text-slate-600 font-black">Withdrawal Amount:</span>
                <span className="font-mono font-black text-red-700 text-base">${reviewModal.item.amount.toLocaleString()}</span>
              </div>
              {reviewModal.item.userNote && (
                <div className="border-t border-red-200 pt-2 text-[11px]">
                  <span className="text-slate-500 font-bold">User Note: </span>
                  <span className="text-slate-800 font-medium">{reviewModal.item.userNote}</span>
                </div>
              )}
            </div>

            {reviewModal.action === 'APPROVED' ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Double-Entry Points Processing</span>
                </p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Approving will deduct <strong>${reviewModal.item.amount.toLocaleString()}</strong> points from @{reviewModal.item.username} and return them to your Admin points ledger. Ensure you have transferred the payout via Telegram / cash / UPI.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                <p className="font-bold">Rejection Warning</p>
                <p className="text-[11px] text-rose-800 mt-1">
                  Rejecting will decline the withdrawal request without moving any points. A notification will be sent to the user.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {reviewModal.action === 'APPROVED' ? 'Payout Note / Reference (Optional)' : 'Rejection Reason *'}
              </label>
              <textarea
                rows="2"
                required={reviewModal.action === 'REJECTED'}
                value={reviewModal.adminNote}
                onChange={(e) => setReviewModal(prev => ({ ...prev, adminNote: e.target.value }))}
                placeholder={
                  reviewModal.action === 'APPROVED'
                    ? 'e.g. Paid via UPI Txn #12345678, cash payout handed over'
                    : 'e.g. Invalid account details or user requested cancellation'
                }
                className="w-full px-3 py-2 bg-white border-2 border-red-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-red-100">
              <button
                type="button"
                onClick={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReviewingWithdrawal}
                className={`px-5 py-2 text-xs font-black text-white rounded-xl shadow-md transition-all ${
                  reviewModal.action === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isReviewingWithdrawal
                  ? 'Processing...'
                  : reviewModal.action === 'APPROVED'
                  ? `Confirm Approval & Deduct $${reviewModal.item.amount.toLocaleString()}`
                  : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* NEW POINT REQUEST TO SUPER ADMIN MODAL                    */}
      {/* ========================================================= */}
      <Modal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        title="Submit New Point Request to Super Admin"
      >
        <form onSubmit={handleAdminRequestSubmit} className="space-y-4 text-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Requested Points (Positive Integer) *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={adminRequestedAmount}
              onChange={(e) => setAdminRequestedAmount(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full px-3 py-2.5 bg-white border-2 border-red-200 rounded-xl text-sm text-red-700 font-mono font-black focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Request *
            </label>
            <input
              type="text"
              required
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              placeholder="e.g. Additional user registrations for festival tournament"
              className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Optional Note
            </label>
            <textarea
              rows="2"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Additional details for Super Admin review..."
              className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-red-100">
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdminReq}
              className="px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl shadow-md transition-all"
            >
              {isSubmittingAdminReq ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
