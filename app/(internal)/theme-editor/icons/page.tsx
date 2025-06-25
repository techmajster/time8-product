export default function IconsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Icons</h1>
            <p className="text-gray-600 mt-1">
              Lucide React icon library browser
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-yellow-100 text-yellow-700 text-xs font-medium">
              Phase 8
            </span>
            <span>Icon Browser</span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <span>Searchable icon gallery</span>
        </div>
      </div>
      
      <div className="border rounded-lg p-8 bg-gray-50/50 text-center">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Icon Browser</h3>
        <p className="text-gray-500">
          Searchable icon gallery will be implemented in Phase 8
        </p>
      </div>
    </div>
  );
} 