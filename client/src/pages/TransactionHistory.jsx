import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetTransactionsQuery, useReverseTransactionMutation } from '../store/apiSlice';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import ExportButtons from '../components/ExportButtons';
import { History, Search, Filter, RotateCcw, Eye, ArrowRight, AlertCircle, Coins } from 'lucide-react';

export default function TransactionHistory() {
  const { user } = useSelector((state) => state.auth);

  // Filter States
  const [search, setSearch] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, refetch } = useGetTransactionsQuery({
    search: search || undefined,
    transactionType: transactionType || undefined,
    status: status || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit,
    offset: page * limit
  });

  const [reverseTxn, { isLoading: isReversing }] = useReverseTransactionMutation();

  const transactions = data?.transactions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Modals
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [reversalModal, setReversalModal] = useState({ isOpen: false, txn: null, reason: '' });
  const [error, setError] = useState('');

  const handleReverseSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!reversalModal.reason) {
      setError('Reason for reversal is required.');
      return;
    }

    try {
      await reverseTxn({
        id: reversalModal.txn.transactionId,
        reason: reversalModal.reason
      }).unwrap();

      setReversalModal({ isOpen: false, txn: null, reason: '' });
      refetch();
    } catch (err) {
      setError(err?.data?.error || 'Reversal failed.');
    }
  };

  const exportColumns = [
    { header: 'Transaction ID', key: 'transactionId' },
    { header: 'Timestamp', key: 'createdAt' },
    { header: 'Type', key: 'transactionType' },
    { header: 'From User', key: 'fromUsername' },
    { header: 'To User', key: 'toUsername' },
    { header: 'Amount (Pts)', key: 'amount' },
    { header: 'Status', key: 'status' },
    { header: 'Reference', key: 'reference' },
    { header: 'Description', key: 'description' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" />
            <span>Point Transaction Ledger</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Immutable double-entry transaction history</p>
        </div>

        <ExportButtons data={transactions} filename="transaction-ledger-report" columns={exportColumns} />
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
        <div className="relative lg:col-span-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search Txn ID, username, description..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div>
          <select
            value={transactionType}
            onChange={(e) => { setTransactionType(e.target.value); setPage(0); }}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Transaction Types</option>
            <option value="SUPER_ADMIN_MINT">Super Admin Mint</option>
            <option value="ADMIN_ALLOCATION">Admin Allocation</option>
            <option value="USER_ALLOCATION">User Allocation</option>
            <option value="ADMIN_REVERSAL">Admin Reversal</option>
            <option value="USER_REVERSAL">User Reversal</option>
          </select>
        </div>

        <div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="REVERSED">Reversed</option>
          </select>
        </div>

        <div className="flex space-x-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            className="w-1/2 px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            className="w-1/2 px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Txn ID</th>
                <th className="py-3.5 px-4">Date/Time</th>
                <th className="py-3.5 px-4">Movement (From &rarr; To)</th>
                <th className="py-3.5 px-4 font-mono text-right">Amount</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">Loading ledger records...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">No transaction records match the specified criteria.</td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {txn.transactionId}
                    </td>

                    <td className="py-3.5 px-4 text-[11px] text-slate-400">
                      {new Date(txn.createdAt).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 font-medium">
                        <span className="text-indigo-300">@{txn.fromUsername}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-cyan-300">@{txn.toUsername}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                      ${txn.amount.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={txn.transactionType} text={txn.transactionType.replace('_', ' ')} />
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={txn.status} />
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setSelectedTxn(txn)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {user?.role === 'SUPER_ADMIN' && txn.status === 'COMPLETED' && (
                          <button
                            onClick={() => { setError(''); setReversalModal({ isOpen: true, txn, reason: '' }); }}
                            className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                            title="Reverse Transaction"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-slate-700/80 bg-slate-900/50 text-xs text-slate-400">
            <span>Showing page {page + 1} of {totalPages} ({total} transactions)</span>
            <div className="flex space-x-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <Modal isOpen={!!selectedTxn} onClose={() => setSelectedTxn(null)} title={`Transaction Detail - ${selectedTxn?.transactionId}`}>
        {selectedTxn && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900 rounded-xl border border-slate-700 font-mono">
              <div>
                <p className="text-slate-400">Sender Balance Before:</p>
                <p className="text-white font-bold">${selectedTxn.fromBalanceBefore.toLocaleString()}</p>
                <p className="text-slate-400 mt-1">Sender Balance After:</p>
                <p className="text-rose-400 font-bold">${selectedTxn.fromBalanceAfter.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-400">Recipient Balance Before:</p>
                <p className="text-white font-bold">${selectedTxn.toBalanceBefore.toLocaleString()}</p>
                <p className="text-slate-400 mt-1">Recipient Balance After:</p>
                <p className="text-emerald-400 font-bold">${selectedTxn.toBalanceAfter.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2 text-slate-300">
              <p><span className="text-slate-400">From:</span> @{selectedTxn.fromUsername} ({selectedTxn.fromName}) [{selectedTxn.fromRole}]</p>
              <p><span className="text-slate-400">To:</span> @{selectedTxn.toUsername} ({selectedTxn.toName}) [{selectedTxn.toRole}]</p>
              <p><span className="text-slate-400">Amount:</span> <span className="text-amber-400 font-mono font-bold">${selectedTxn.amount.toLocaleString()}</span></p>
              <p><span className="text-slate-400">Transaction Type:</span> {selectedTxn.transactionType}</p>
              <p><span className="text-slate-400">Created By:</span> @{selectedTxn.createdByUsername}</p>
              <p><span className="text-slate-400">Reference:</span> {selectedTxn.reference || 'N/A'}</p>
              <p><span className="text-slate-400">Description:</span> {selectedTxn.description || 'N/A'}</p>
              <p><span className="text-slate-400">Timestamp:</span> {new Date(selectedTxn.createdAt).toLocaleString()}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* REVERSAL MODAL (SUPER ADMIN) */}
      <Modal
        isOpen={reversalModal.isOpen}
        onClose={() => setReversalModal({ isOpen: false, txn: null, reason: '' })}
        title={`Reverse Transaction ${reversalModal.txn?.transactionId}`}
      >
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleReverseSubmit} className="space-y-4">
          <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-1 text-xs">
            <p className="text-slate-400">Original Transaction: <span className="text-white font-mono">{reversalModal.txn?.transactionId}</span></p>
            <p className="text-slate-400">Amount to Refund: <span className="text-amber-400 font-bold font-mono">${(reversalModal.txn?.amount || 0).toLocaleString()}</span></p>
            <p className="text-slate-400">From: @{reversalModal.txn?.fromUsername} &rarr; To: @{reversalModal.txn?.toUsername}</p>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
              * Note: Reversal will create a new offsetting transaction returning ${(reversalModal.txn?.amount || 0).toLocaleString()} back to @{reversalModal.txn?.fromUsername}.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Reversal *</label>
            <textarea
              required
              rows="3"
              value={reversalModal.reason}
              onChange={(e) => setReversalModal({ ...reversalModal, reason: e.target.value })}
              placeholder="e.g. Correcting mistaken distribution amount"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setReversalModal({ isOpen: false, txn: null, reason: '' })}
              className="px-4 py-2 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReversing}
              className="px-4 py-2 text-xs text-white bg-amber-600 hover:bg-amber-500 rounded-lg font-semibold"
            >
              {isReversing ? 'Processing Reversal...' : 'Execute Reversal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
