import { useState } from 'react';
import type { Database } from '../lib/types';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type ContactInsert = Database['public']['Tables']['contacts']['Insert'];

export default function ContactForm() {
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!agencySlug) {
        throw new Error('Agency slug is required');
      }

      // First, get the agency ID from the slug
      const { data: agencies, error: agencyError } = await supabase
        .from('agencies')
        .select('id')
        .eq('slug', agencySlug);

      if (agencyError || !agencies || agencies.length === 0) {
        throw new Error('Agency not found');
      }

      const agency = agencies[0] as { id: string };

      // Insert the contact
      const newContact: ContactInsert = {
        agency_id: agency.id,
        name,
        email,
        message,
        status: 'new',
      };

      // Type assertion needed due to Supabase type inference issue
      const { error: insertError } = await supabase
        .from('contacts')
        .insert(newContact as never);

      if (insertError) throw insertError;

      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-600 mb-6">
          Send us a message and we'll get back to you as soon as possible.
        </p>

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded">
            Thank you! Your message has been sent successfully.
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
