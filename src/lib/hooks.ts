/**
 * Blog application hooks
 *
 * Note: For a larger application, these would be split into separate files
 * in a hooks directory. For this portfolio project, I've kept them in a
 * single file to maintain simplicity while demonstrating hook patterns.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import {
  Post,
  Category,
  Comment,
  Profile,
  ResponseState,
} from '@/types/schema';
import { Session, User } from '@supabase/supabase-js';

// Authentication hooks
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user profile when user changes
  useEffect(() => {
    async function getProfile() {
      if (!user) {
        setProfile(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        // Convert Supabase data to match Profile type
        const profileData: Profile = {
          id: data.id,
          username: data.username,
          display_name: data.display_name || undefined,
          avatar_url: data.avatar_url || undefined,
          bio: data.bio || undefined,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        setProfile(profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    }

    getProfile();
  }, [user]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  };

  // Sign out
  const signOut = async () => {
    return supabase.auth.signOut();
  };

  return {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };
}

// Post-related hooks
export function usePosts(page = 1, pageSize = 10) {
  const [state, setState] = useState<ResponseState<Post[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchPosts() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
          .from('posts')
          .select(
            `
            id, 
            title, 
            slug, 
            excerpt, 
            featured_image, 
            published_at,
            profiles(id, username, display_name, avatar_url)
          `
          )
          .eq('published', true)
          .order('published_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        setState({
          data: data as Post[],
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching posts:', error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to load posts',
        }));
      }
    }

    fetchPosts();
  }, [page, pageSize]);

  return state;
}

export function usePost(slug: string | null) {
  const [state, setState] = useState<ResponseState<Post | null>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!slug) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    async function fetchPost() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const { data, error } = await supabase
          .from('posts')
          .select(
            `
            id, 
            title, 
            slug, 
            content, 
            excerpt, 
            featured_image, 
            published, 
            published_at,
            profiles(id, username, display_name, avatar_url),
            post_categories(
              categories(id, name, slug)
            )
          `
          )
          .eq('slug', slug)
          .single();

        if (error) throw error;

        setState({
          data: data as Post,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error(`Error fetching post with slug '${slug}':`, error);
        setState({
          data: null,
          loading: false,
          error: 'Failed to load post',
        });
      }
    }

    fetchPost();
  }, [slug]);

  return state;
}

export function useCategories() {
  const [state, setState] = useState<ResponseState<Category[]>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchCategories() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (error) throw error;

        setState({
          data: data as Category[],
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching categories:', error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to load categories',
        }));
      }
    }

    fetchCategories();
  }, []);

  return state;
}

export function useComments(postId: string | null) {
  const [state, setState] = useState<ResponseState<Comment[]>>({
    data: [],
    loading: true,
    error: null,
  });

  const fetchComments = useCallback(async () => {
    if (!postId) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          id, 
          content, 
          created_at,
          profiles(id, username, display_name, avatar_url)
        `
        )
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setState({
        data: data as Comment[],
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to load comments',
      }));
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();

    // Set up real-time subscription for new comments
    if (!postId) return;

    const subscription = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [postId, fetchComments]);

  const addComment = useCallback(
    async (content: string) => {
      if (!postId) return { error: { message: 'No post selected' } };

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user)
        return { error: { message: 'You must be logged in to comment' } };

      return supabase.from('comments').insert({
        post_id: postId,
        author_id: user.id,
        content,
      });
    },
    [postId]
  );

  const deleteComment = useCallback(async (commentId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'You must be logged in' } };

    return supabase
      .from('comments')
      .delete()
      .match({ id: commentId, author_id: user.id });
  }, []);

  return {
    ...state,
    addComment,
    deleteComment,
  };
}
