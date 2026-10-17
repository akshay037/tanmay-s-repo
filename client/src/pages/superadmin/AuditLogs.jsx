import React, { useState } from 'react';
import { useGetAuditLogsQuery } from '../../store/apiSlice';
import ExportButtons from '../../components/ExportButtons';
import { FileCheck, Search, Shield, Filter } from 'lucide-react';

export default function AuditLogs() {
  const [actorUsername, setActorUsername] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading } = useGetAuditLogsQuery({
    actorUsername: actorUsername || undefined,
    action: action || undefined,
    targetType: targetType || undefined,
    limit,
    offset: page * limit
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const exportColumns = [
    { header: 'ID', key: 'id' },
    { header: 'Actor Username', key: 'actor_username' },
    { header: 'Actor Role', key: 'actor_role' },
    { header: 'Action', key: 'action' },
    { header: 'Target Type', key: 'target_type' },
    { header: 'Target Name', key: 'target_name' },
    { header: 'New Value', key: 'new_value' },
    { header: 'IP Address', key: 'ip_address' },
    { header: 'Timestamp', key: 'created_at' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-emerald-400" />
            <span>Immutable Audit Logs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Append-only audit trail of all security & point management actions</p>
        </div>

        <ExportButtons data={logs} filename="audit-logs-report" columns={exportColumns} />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
        <div className="relative">
          <input
            type="text"
            value={actorUsername}
            onChange={(e) => { setActorUsername(e.target.value); setPage(0); }}
            placeholder="Filter by Actor Username..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div>
          <input
            type="text"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(0); }}
            placeholder="Filter by Action (e.g. POINT_TRANSFER)..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); setPage(0); }}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Target Types</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="POINT_REQUEST">POINT_REQUEST</option>
            <option value="TRANSACTION">TRANSACTION</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Action ID</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action Type</th>
                <th className="py-3.5 px-4">Target</th>
                <th className="py-3.5 px-4">Log Details</th>
                <th className="py-3.5 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">Loading audit log entries...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">No audit log records found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/30 transition-colors font-mono">
                    <td className="py-3.5 px-4 text-slate-400">#AUD-{log.id}</td>

                    <td className="py-3.5 px-4 text-[11px] text-slate-300 font-sans">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <span className="font-semibold text-white">@{log.actor_username || 'SYSTEM'}</span>
                      <span className="ml-1 text-[10px] text-indigo-400">({log.actor_role})</span>
                    </td>

                    <td className="py-3.5 px-4 font-sans font-semibold text-emerald-400">
                      {log.action}
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      {log.target_type && (
                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px] font-mono mr-1">
                          {log.target_type}
                        </span>
                      )}
                      <span className="text-white">{log.target_name || `#${log.target_id || ''}`}</span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate font-sans text-slate-400 text-[11px]">
                      {log.new_value || log.old_value || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-[11px] text-slate-500">
                      {log.ip_address}
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
            <span>Showing page {page + 1} of {totalPages} ({total} entries)</span>
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
    </div>
  );
}
