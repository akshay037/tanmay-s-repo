import React, { useState } from 'react';
import {
  useGetPointRequestsQuery,
  useReviewPointRequestMutation,
  useGetUserWithdrawalRequestsQuery,
  useReviewUserWithdrawalRequestMutation
} from '../../store/apiSlice';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  ArrowUpFromLine,
  Coins,
  ShieldCheck,
  Check,
  X,
  Search,
  Filter
} from 'lucide-react';

export default function PointRequestsApproval() {
  const [activeTab, setActiveTab] = useState('ADMIN_REQUESTS'); // 'ADMIN_REQUESTS' | 'USER_WITHDRAWALS'

  // Admin Requests
  const { data: adminRequests = [], isLoading: isLoadingAdminReqs, refetch: refetchAdminReqs } = useGetPointRequestsQuery();
  const [reviewAdminRequest, { isLoading: isReviewingAdmin }] = useReviewPointRequestMutation();

  // User Withdrawals
  const { data: userWithdrawals = [], isLoading: isLoadingWithdrawals, refetch: refetchWithdrawals } = useGetUserWithdrawalRequestsQuery();
  const [reviewUserWithdrawal, { isLoading: isReviewingWithdrawal }] = useReviewUserWithdrawalRequestMutation();

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Review Modals
  const [adminReviewModal, setAdminReviewModal] = useState({
    isOpen: false,
    req: null,
    action: 'APPROVED',
    approvedAmount: '',
    comment: '',
    error: ''
  });

  const [withdrawalReviewModal, setWithdrawalReviewModal] = useState({
    isOpen: false,
    req: null,
    action: 'APPROVED',
    adminNote: '',
    error: ''
  });

  const pendingAdminCount = adminRequests.filter(r => r.status === 'PENDING').length;
  const pendingUserWithdrawalsCount = userWithdrawals.filter(w => w.status === 'PENDING').length;

  // Filter Admin Requests
  const filteredAdminRequests = adminRequests.filter(r => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || r.requestCode?.toLowerCase().includes(q) || r.adminUsername?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // Filter User Withdrawals
  const filteredUserWithdrawals = userWithdrawals.filter(w => {
    const matchesStatus = filterStatus === 'ALL' || w.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || w.requestCode?.toLowerCase().includes(q) || w.username?.toLowerCase().includes(q) || w.adminUsername?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // Open Admin Request Modal
  const openAdminReviewModal = (req, action) => {
    setAdminReviewModal({
      isOpen: true,
      req,
      action,
      approvedAmount: action === 'PARTIALLY_APPROVED' ? String(Math.floor(req.requestedAmount / 2)) : String(req.requestedAmount),
      comment: '',
      error: ''
    });
  };

  // Submit Admin Review
  const handleAdminReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await reviewAdminRequest({
        id: adminReviewModal.req.id,
        status: adminReviewModal.action,
        approvedAmount: adminReviewModal.action === 'PARTIALLY_APPROVED' ? parseInt(adminReviewModal.approvedAmount, 10) : adminReviewModal.req.requestedAmount,
        reviewerComment: adminReviewModal.comment
      }).unwrap();

      setAdminReviewModal({ isOpen: false, req: null, action: 'APPROVED', approvedAmount: '', comment: '', error: '' });
      refetchAdminReqs();
    } catch (err) {
      setAdminReviewModal(prev => ({ ...prev, error: err?.data?.error || 'Review submission failed.' }));
    }
  };

  // Open User Withdrawal Modal
  const openWithdrawalReviewModal = (req, action) => {
    setWithdrawalReviewModal({
      isOpen: true,
      req,
      action,
      adminNote: '',
      error: ''
    });
  };

  // Submit User Withdrawal Review
  const handleWithdrawalReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await reviewUserWithdrawal({
        id: withdrawalReviewModal.req.id,
        status: withdrawalReviewModal.action,
        adminNote: withdrawalReviewModal.adminNote
      }).unwrap();

      setWithdrawalReviewModal({ isOpen: false, req: null, action: 'APPROVED', adminNote: '', error: '' });
      refetchWithdrawals();
    } catch (err) {
      setWithdrawalReviewModal(prev => ({ ...prev, error: err?.data?.error || 'Withdrawal review failed.' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-red-600" />
            <span>Point & Withdrawal Approvals</span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Super Admin master approval center for Admin point requests and user withdrawals
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                filterStatus === st
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center space-x-2 border-b-2 border-red-100 pb-2">
        <button
          onClick={() => setActiveTab('ADMIN_REQUESTS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'ADMIN_REQUESTS'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-red-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Admin Point Requests</span>
          {pendingAdminCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'ADMIN_REQUESTS' ? 'bg-white text-red-700' : 'bg-red-600 text-white'
            }`}>
              {pendingAdminCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('USER_WITHDRAWALS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === 'USER_WITHDRAWALS'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-red-200'
          }`}
        >
          <ArrowUpFromLine className="w-4 h-4" />
          <span>User Withdrawal Requests</span>
          {pendingUserWithdrawalsCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'USER_WITHDRAWALS' ? 'bg-white text-red-700' : 'bg-amber-500 text-white'
            }`}>
              {pendingUserWithdrawalsCount}
            </span>
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by request code or username..."
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500 font-medium"
        />
      </div>

      {/* TAB 1: ADMIN POINT REQUESTS TABLE */}
      {activeTab === 'ADMIN_REQUESTS' && (
        <div className="bg-white border-2 border-red-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-red-50/60 border-b-2 border-red-100 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Request Code</th>
                  <th className="py-3.5 px-4">Admin Requester</th>
                  <th className="py-3.5 px-4 text-right">Requested Amount</th>
                  <th className="py-3.5 px-4 text-right">Approved Amount</th>
                  <th className="py-3.5 px-4">Reason & Note</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50 text-xs text-slate-700">
                {isLoadingAdminReqs ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">Loading admin point requests...</td>
                  </tr>
                ) : filteredAdminRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">No admin requests found.</td>
                  </tr>
                ) : (
                  filteredAdminRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-red-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                        {req.requestCode}
                        <p className="text-[10px] text-slate-400 font-sans font-medium">
                          {new Date(req.createdAt).toLocaleString()}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-black text-red-700">@{req.adminUsername}</p>
                        <p className="text-[11px] text-slate-500">{req.adminName}</p>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-red-700">
                        ${req.requestedAmount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700">
                        {req.status === 'PENDING' ? '-' : `$${(req.approvedAmount || 0).toLocaleString()}`}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-900 font-bold truncate">{req.reason}</p>
                        {req.note && <p className="text-[11px] text-slate-500 italic truncate">{req.note}</p>}
                        {req.reviewerComment && (
                          <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1 font-semibold">
                            <MessageSquare className="w-3 h-3 text-red-600" />
                            <span>Comment: {req.reviewerComment}</span>
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
                              onClick={() => openAdminReviewModal(req, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openAdminReviewModal(req, 'PARTIALLY_APPROVED')}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black shadow-sm"
                            >
                              Partial
                            </button>
                            <button
                              onClick={() => openAdminReviewModal(req, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 rounded-lg text-xs font-black"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Reviewed</span>
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

      {/* TAB 2: USER WITHDRAWAL REQUESTS TABLE */}
      {activeTab === 'USER_WITHDRAWALS' && (
        <div className="bg-white border-2 border-red-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-red-50/60 border-b-2 border-red-100 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Request Code</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Assigned Admin</th>
                  <th className="py-3.5 px-4 text-right">User Balance</th>
                  <th className="py-3.5 px-4 text-right">Requested Withdrawal</th>
                  <th className="py-3.5 px-4">Date & Details</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50 text-xs text-slate-700">
                {isLoadingWithdrawals ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400 font-bold">Loading user withdrawal requests...</td>
                  </tr>
                ) : filteredUserWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400 font-bold">No user withdrawal requests found.</td>
                  </tr>
                ) : (
                  filteredUserWithdrawals.map((req) => (
                    <tr key={req.id} className="hover:bg-red-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                        {req.requestCode}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-black text-slate-900">@{req.username}</p>
                        <p className="text-[11px] text-slate-500">{req.fullName}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-red-700">@{req.adminUsername}</span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        ${req.userCurrentBalance.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-red-700 text-sm">
                        ${req.amount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-[11px] text-slate-400 font-medium">
                          {new Date(req.createdAt).toLocaleString()}
                        </p>
                        {req.userNote && (
                          <p className="text-[11px] text-slate-700 italic truncate" title={req.userNote}>
                            📝 {req.userNote}
                          </p>
                        )}
                        {req.adminNote && (
                          <p className="text-[10px] text-slate-500 italic truncate" title={req.adminNote}>
                            Admin Note: {req.adminNote}
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
                              onClick={() => openWithdrawalReviewModal(req, 'APPROVED')}
                              disabled={req.userCurrentBalance < req.amount}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 text-white rounded-lg text-xs font-black shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openWithdrawalReviewModal(req, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 rounded-lg text-xs font-black"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Reviewed</span>
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

      {/* ADMIN POINT REQUEST REVIEW MODAL */}
      <Modal
        isOpen={adminReviewModal.isOpen}
        onClose={() => setAdminReviewModal(prev => ({ ...prev, isOpen: false }))}
        title={`Review Point Request ${adminReviewModal.req?.requestCode}`}
      >
        {adminReviewModal.error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 text-xs font-bold rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{adminReviewModal.error}</span>
          </div>
        )}

        {adminReviewModal.req && (
          <form onSubmit={handleAdminReviewSubmit} className="space-y-4 text-slate-800">
            <div className="p-3.5 bg-red-50/70 border-2 border-red-200 rounded-xl space-y-1 text-xs">
              <p className="text-slate-500">Admin Requester: <span className="text-red-700 font-black">@{adminReviewModal.req.adminUsername}</span></p>
              <p className="text-slate-500">Requested Amount: <span className="text-red-700 font-black font-mono">${adminReviewModal.req.requestedAmount.toLocaleString()}</span></p>
              <p className="text-slate-500">Reason: <span className="text-slate-900 font-bold">{adminReviewModal.req.reason}</span></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Decision Action</label>
              <select
                value={adminReviewModal.action}
                onChange={(e) => setAdminReviewModal({ ...adminReviewModal, action: e.target.value })}
                className="w-full px-3 py-2 bg-white border-2 border-red-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-red-500"
              >
                <option value="APPROVED">Approve Full Amount (${adminReviewModal.req.requestedAmount.toLocaleString()})</option>
                <option value="PARTIALLY_APPROVED">Approve Partial Amount</option>
                <option value="REJECTED">Reject Request</option>
              </select>
            </div>

            {adminReviewModal.action === 'PARTIALLY_APPROVED' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Partial Approved Amount *</label>
                <input
                  type="number"
                  min="1"
                  max={adminReviewModal.req.requestedAmount - 1}
                  required
                  value={adminReviewModal.approvedAmount}
                  onChange={(e) => setAdminReviewModal({ ...adminReviewModal, approvedAmount: e.target.value })}
                  className="w-full px-3 py-2 bg-white border-2 border-red-200 rounded-xl text-xs font-mono font-black text-red-700 focus:outline-none focus:border-red-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Comment / Note</label>
              <textarea
                rows="2"
                value={adminReviewModal.comment}
                onChange={(e) => setAdminReviewModal({ ...adminReviewModal, comment: e.target.value })}
                placeholder="e.g. Approved based on allocation limit"
                className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-red-100">
              <button
                type="button"
                onClick={() => setAdminReviewModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReviewingAdmin}
                className={`px-5 py-2 text-xs font-black text-white rounded-xl shadow-md ${
                  adminReviewModal.action === 'REJECTED'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {isReviewingAdmin ? 'Submitting...' : 'Confirm Decision'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* USER WITHDRAWAL REVIEW MODAL */}
      <Modal
        isOpen={withdrawalReviewModal.isOpen}
        onClose={() => setWithdrawalReviewModal(prev => ({ ...prev, isOpen: false }))}
        title={`Review User Withdrawal ${withdrawalReviewModal.req?.requestCode}`}
      >
        {withdrawalReviewModal.error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 text-xs font-bold rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{withdrawalReviewModal.error}</span>
          </div>
        )}

        {withdrawalReviewModal.req && (
          <form onSubmit={handleWithdrawalReviewSubmit} className="space-y-4 text-slate-800">
            <div className="p-3.5 bg-red-50/70 border-2 border-red-200 rounded-xl space-y-1 text-xs">
              <p className="text-slate-500">User: <span className="text-slate-900 font-black">@{withdrawalReviewModal.req.username}</span></p>
              <p className="text-slate-500">Assigned Admin: <span className="text-red-700 font-bold">@{withdrawalReviewModal.req.adminUsername}</span></p>
              <p className="text-slate-500">Withdrawal Amount: <span className="text-red-700 font-black font-mono">${withdrawalReviewModal.req.amount.toLocaleString()}</span></p>
              <p className="text-slate-500">User Balance: <span className="text-emerald-700 font-bold font-mono">${withdrawalReviewModal.req.userCurrentBalance.toLocaleString()}</span></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {withdrawalReviewModal.action === 'APPROVED' ? 'Payout Reference / Note (Optional)' : 'Rejection Reason *'}
              </label>
              <textarea
                rows="2"
                required={withdrawalReviewModal.action === 'REJECTED'}
                value={withdrawalReviewModal.adminNote}
                onChange={(e) => setWithdrawalReviewModal(prev => ({ ...prev, adminNote: e.target.value }))}
                placeholder={
                  withdrawalReviewModal.action === 'APPROVED'
                    ? 'e.g. Paid via UPI Txn #12345678'
                    : 'e.g. Incomplete payment details'
                }
                className="w-full px-3 py-2 bg-white border-2 border-red-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-red-100">
              <button
                type="button"
                onClick={() => setWithdrawalReviewModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReviewingWithdrawal}
                className={`px-5 py-2 text-xs font-black text-white rounded-xl shadow-md ${
                  withdrawalReviewModal.action === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isReviewingWithdrawal ? 'Processing...' : `Confirm ${withdrawalReviewModal.action}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
