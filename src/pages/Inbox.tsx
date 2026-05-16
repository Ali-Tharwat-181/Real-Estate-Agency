import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Contact } from '../lib/types';

export default function Inbox() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const existingIdsRef = useRef<Set<string>>(new Set());

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const contactsList = (data || []) as Contact[];
      setContacts(contactsList);
      // Track existing IDs to prevent duplicates with realtime
      existingIdsRef.current = new Set(contactsList.map((c) => c.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }

    // Load initial contacts
    loadContacts();

    // Set up realtime subscription
    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contacts',
          filter: `agency_id=eq.${profile.agency_id}`,
        },
        (payload) => {
          const newContact = payload.new as Contact;
          // Only add if not already in the list (avoid duplicates)
          if (!existingIdsRef.current.has(newContact.id)) {
            setContacts((prev) => [newContact, ...prev]);
            existingIdsRef.current.add(newContact.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contacts',
          filter: `agency_id=eq.${profile.agency_id}`,
        },
        (payload) => {
          const updatedContact = payload.new as Contact;
          setContacts((prev) =>
            prev.map((c) => (c.id === updatedContact.id ? updatedContact : c))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, profile, navigate]);

  const updateStatus = async (contactId: string, newStatus: Contact['status']) => {
    try {
      const { error } = await supabase
        .from('contacts')
        // @ts-expect-error - TypeScript 6.0 compatibility issue with Supabase update types
        .update({ status: newStatus })
        .eq('id', contactId);

      if (error) throw error;

      // Optimistically update UI
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded">
            {error}
          </div>
        )}

        {contacts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            No contacts yet. Share your contact form to start receiving messages.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className={contact.status === 'new' ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {contact.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                        <div className="line-clamp-2">{contact.message}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <select
                          value={contact.status}
                          onChange={(e) => updateStatus(contact.id, e.target.value as Contact['status'])}
                          className="block w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="discarded">Discarded</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
