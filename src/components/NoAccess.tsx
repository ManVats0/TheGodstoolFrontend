export default function NoAccess() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div
        className="text-center py-24 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
      >
        <div className="text-4xl mb-4"></div>
        <p className="text-white font-medium">Your role doesn't have access to this page.</p>
      </div>
    </div>
  )
}
