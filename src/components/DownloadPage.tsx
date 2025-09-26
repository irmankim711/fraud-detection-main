import React, { useState } from 'react';

interface ExportOption {
  id: string;
  name: string;
  description: string;
  format: string;
}

const exportOptions: ExportOption[] = [
  {
    id: 'transactions',
    name: 'Transaction Report',
    description: 'Export all transaction data with fraud scores',
    format: 'CSV, JSON, PDF'
  },
  {
    id: 'alerts',
    name: 'Fraud Alerts Report',
    description: 'Export fraud alerts and investigation results',
    format: 'CSV, JSON, PDF'
  },
  {
    id: 'analytics',
    name: 'Analytics Summary',
    description: 'Export fraud detection analytics and metrics',
    format: 'PDF, JSON'
  },
  {
    id: 'audit',
    name: 'Audit Trail',
    description: 'Export system audit logs and user actions',
    format: 'CSV, JSON'
  }
];

export function DownloadPage() {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [dateRange, setDateRange] = useState({
    from: '2023-12-01',
    to: '2023-12-15'
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleOptionToggle = (optionId: string) => {
    const newSelected = new Set(selectedOptions);
    if (newSelected.has(optionId)) {
      newSelected.delete(optionId);
    } else {
      newSelected.add(optionId);
    }
    setSelectedOptions(newSelected);
  };

  const handleExport = async () => {
    if (selectedOptions.size === 0) {
      alert('Please select at least one export option');
      return;
    }

    setIsExporting(true);

    // Simulate export process
    setTimeout(() => {
      const selectedNames = Array.from(selectedOptions).map(id =>
        exportOptions.find(opt => opt.id === id)?.name
      ).join(', ');

      alert(`Export completed: ${selectedNames} (${format.toUpperCase()}) for ${dateRange.from} to ${dateRange.to}`);
      setIsExporting(false);
    }, 2000);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Data Export</h1>
        <p className="text-gray-600 mt-2">Download fraud detection data and reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Options */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Data to Export</h2>

            <div className="space-y-4">
              {exportOptions.map((option) => (
                <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id={option.id}
                      checked={selectedOptions.has(option.id)}
                      onChange={() => handleOptionToggle(option.id)}
                      className="mt-1 mr-4 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor={option.id} className="cursor-pointer">
                        <h3 className="font-semibold text-gray-900">{option.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{option.description}</p>
                        <p className="text-blue-600 text-sm mt-2">Available formats: {option.format}</p>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export Configuration */}
        <div className="space-y-6">
          {/* Date Range */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Date Range</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Export Format</h2>

            <div className="space-y-3">
              {[
                { value: 'csv', label: 'CSV', description: 'Comma-separated values' },
                { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
                { value: 'pdf', label: 'PDF', description: 'Portable Document Format' }
              ].map((formatOption) => (
                <label key={formatOption.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={formatOption.value}
                    checked={format === formatOption.value}
                    onChange={(e) => setFormat(e.target.value as 'csv' | 'json' | 'pdf')}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{formatOption.label}</div>
                    <div className="text-sm text-gray-500">{formatOption.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <div className="bg-white rounded-lg shadow p-6">
            <button
              onClick={handleExport}
              disabled={isExporting || selectedOptions.size === 0}
              className={`w-full py-3 px-4 rounded-md font-medium text-white transition duration-200 ${
                isExporting || selectedOptions.size === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isExporting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </div>
              ) : (
                'Export Selected Data'
              )}
            </button>

            {selectedOptions.size === 0 && (
              <p className="text-red-600 text-sm mt-2 text-center">
                Please select at least one export option
              </p>
            )}
          </div>

          {/* Export Summary */}
          {selectedOptions.size > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Export Summary</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                {Array.from(selectedOptions).map(id => (
                  <li key={id}>• {exportOptions.find(opt => opt.id === id)?.name}</li>
                ))}
              </ul>
              <p className="text-sm text-blue-700 mt-2">
                Format: {format.toUpperCase()} | Range: {dateRange.from} to {dateRange.to}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}