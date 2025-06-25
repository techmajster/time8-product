export default function ThemePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Theme</h1>
        <p className="text-gray-600">Edit colors, typography, borders, corners, and shadows</p>
      </div>
      
      <div className="space-y-8">
        <div className="border rounded-lg p-8 bg-gray-50/50 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Color Tokens</h3>
          <p className="text-gray-500">
            Color editing will be implemented in Phase 4
          </p>
        </div>
        
        <div className="border rounded-lg p-8 bg-gray-50/50 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Typography</h3>
          <p className="text-gray-500">
            Typography editing will be implemented in Phase 5
          </p>
        </div>
        
        <div className="border rounded-lg p-8 bg-gray-50/50 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Borders & Corners</h3>
          <p className="text-gray-500">
            Border and corner editing will be implemented in Phase 6
          </p>
        </div>
        
        <div className="border rounded-lg p-8 bg-gray-50/50 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Shadows</h3>
          <p className="text-gray-500">
            Shadow editing will be implemented in Phase 7
          </p>
        </div>
      </div>
    </div>
  );
} 