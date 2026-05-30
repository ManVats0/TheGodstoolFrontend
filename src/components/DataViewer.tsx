import React from 'react';

interface DataViewerProps {
  data: any;
}

const DataViewer: React.FC<DataViewerProps> = ({ data }) => {
  // 🔥 SAFE DATA ACCESS
  const sampleData = data.sample_data || data.top_500_rows || [];
  const hasData = sampleData.length > 0;
  const firstRow = sampleData[0] || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 🎯 TOP 500 TABLE */}
      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 max-h-[70vh] overflow-auto">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          📊 Top 500 Rows Preview
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full text-sm font-bold">
            {data.dataset_info?.rows?.toLocaleString()} total rows
          </span>
        </h3>
        
        {hasData ? (
          <div className="overflow-x-auto rounded-2xl bg-white/5">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white/20 backdrop-blur-sm">
                <tr>
                  {Object.keys(firstRow).map((key: string) => (
                    <th key={key} className="p-4 font-bold text-left border-b border-white/30">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleData.slice(0, 20).map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-white/30 transition-colors border-b border-white/10">
                    {Object.values(row).map((val: any, j: number) => (
                      <td key={j} className="p-4">
                        {typeof val === 'number' ? val.toLocaleString() : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-center mt-6 p-4 bg-white/10 rounded-2xl">
              <p className="text-white/70 text-sm mb-2">👆 Hover to explore first 20 of 500 rows</p>
              {data.download_url && (
                <a href={data.download_url} className="text-blue-300 hover:text-blue-200 underline text-sm">
                  Download full Top 500 CSV →
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-white/60 text-center py-12">Upload CSV to see data preview ✨</p>
        )}
      </div>

      {/* 📈 STATS DASHBOARD */}
      <div className="space-y-6">
        {/* Quality Score */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center shadow-2xl hover:shadow-3xl transition-all duration-300">
          <div className="w-28 h-28 mx-auto mb-4 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center shadow-2xl">
            <span className="text-3xl font-black text-white">{data.quality_score || 0}%</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Dataset Quality</h3>
          <p className="text-white/70">{data.quality_score > 80 ? 'Excellent!' : 'Needs cleaning'}</p>
        </div>

        {/* Key Metrics */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <h3 className="text-xl font-bold text-white mb-6">📊 Dataset Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-white/10 rounded-xl">
              <span className="text-white/60 block">Total Rows</span>
              <div className="text-2xl font-black text-white">
                {data.dataset_info?.rows?.toLocaleString() || 0}
              </div>
            </div>
            <div className="p-4 bg-white/10 rounded-xl">
              <span className="text-white/60 block">Columns</span>
              <div className="text-2xl font-black text-white">
                {data.dataset_info?.columns || 0}
              </div>
            </div>
            <div className="p-4 bg-white/10 rounded-xl">
              <span className="text-white/60 block">Memory</span>
              <div className="text-xl font-bold text-white">
                {(data.dataset_info?.memory_mb || 0)?.toFixed(1)} MB
              </div>
            </div>
            <div className="p-4 bg-white/10 rounded-xl">
              <span className="text-white/60 block">Missing Values</span>
              <div className="text-xl font-bold text-orange-400">
                {data.dataset_info?.missing_total?.toLocaleString() || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Download */}
        {data.download_url && (
          <a 
            href={data.download_url}
            className="block w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-4 px-8 rounded-3xl text-center shadow-2xl hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 text-lg"
            download
          >
            💾 Download Top 500 Preview CSV
          </a>
        )}
      </div>
    </div>
  );
};

export default DataViewer;
