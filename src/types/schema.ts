/**
 * Type definitions for the blog application
 *
 * These types interface with Supabase's generated Database type
 * but provide more convenient structures for use in the app.
 */

export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
  profiles: Profile;
  post_categories?: {
    categories: Category;
  }[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  descrition?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles: Profile;
}

export interface ResponseState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}
