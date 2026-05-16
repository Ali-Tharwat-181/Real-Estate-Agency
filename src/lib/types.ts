export interface Agency {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface Contact {
  id: string;
  agency_id: string;
  name: string;
  email: string;
  message: string;
  status: 'new' | 'contacted' | 'discarded';
  created_at: string;
}

export interface Profile {
  id: string;
  agency_id: string;
}

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: Agency;
        Insert: Omit<Agency, 'id' | 'created_at'>;
        Update: Partial<Omit<Agency, 'id'>>;
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, 'id' | 'created_at'>;
        Update: Partial<Omit<Contact, 'id'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Profile;
        Update: Partial<Profile>;
      };
    };
  };
}
