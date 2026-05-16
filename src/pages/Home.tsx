export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">PropPilot</h1>
        <p className="text-xl text-gray-600 mb-8">
          Real Estate Contact Management System
        </p>
        
        <div className="space-y-4">
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">For Agents</h2>
            <p className="text-gray-600 mb-4">
              Sign in to manage your agency's contacts
            </p>
            <a
              href="/login"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition"
            >
              Agent Login
            </a>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">For Customers</h2>
            <p className="text-gray-600 mb-4">
              Visit your agency's contact form to get in touch
            </p>
            <p className="text-sm text-gray-500">
              Example: /c/agency-one
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
