import React from 'react';
import { Download, FileText, Table } from 'lucide-react';

export default function ExportButtons({ data = [], filename = 'export-data', columns = [] }) {
  const exportCSV = () => {
    if (!data || data.length === 0) return;

    // Headers
    const headers = columns.length > 0
      ? columns.map(c => c.header)
      : Object.keys(data[0]);

    const keys = columns.length > 0
      ? columns.map(c => c.key)
      : Object.keys(data[0]);

    let csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n';

    data.forEach(row => {
      const line = keys.map(k => {
        let val = row[k];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'object') val = JSON.stringify(val);
        // Escape quotes
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',');
      csvContent += line + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    // Generates an .xls compatible HTML format for Excel
    if (!data || data.length === 0) return;

    const headers = columns.length > 0 ? columns.map(c => c.header) : Object.keys(data[0]);
    const keys = columns.length > 0 ? columns.map(c => c.key) : Object.keys(data[0]);

    let tableHtml = '<table border="1"><thead><tr>';
    headers.forEach(h => { tableHtml += `<th style="background-color:#1e293b;color:#ffffff;">${h}</th>`; });
    tableHtml += '</tr></thead><tbody>';

    data.forEach(row => {
      tableHtml += '<tr>';
      keys.forEach(k => {
        let val = row[k];
        if (val === null || val === undefined) val = '';
        tableHtml += `<td>${val}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportPDF = () => {
    // Opens print view formatted for PDF export
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const headers = columns.length > 0 ? columns.map(c => c.header) : Object.keys(data[0]);
    const keys = columns.length > 0 ? columns.map(c => c.key) : Object.keys(data[0]);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filename} - Report</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #1e293b; }
          h2 { color: #0f172a; margin-bottom: 5px; }
          p { color: #64748b; font-size: 12px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <h2>System Export Report</h2>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${keys.map(k => `<td>${row[k] !== undefined && row[k] !== null ? row[k] : ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <button
        onClick={exportCSV}
        disabled={!data || data.length === 0}
        className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
        title="Export CSV"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400" />
        <span>CSV</span>
      </button>

      <button
        onClick={exportExcel}
        disabled={!data || data.length === 0}
        className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
        title="Export Excel"
      >
        <Table className="w-3.5 h-3.5 text-blue-400" />
        <span>Excel</span>
      </button>

      <button
        onClick={exportPDF}
        disabled={!data || data.length === 0}
        className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
        title="Export PDF"
      >
        <FileText className="w-3.5 h-3.5 text-purple-400" />
        <span>PDF</span>
      </button>
    </div>
  );
}
