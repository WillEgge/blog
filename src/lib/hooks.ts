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

// Authentication hooks
export function useAuth() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the initial session and user
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    });

    // Listen for changes to the session and user
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch the profile when the user changes
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

        setProfile(data);
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

  // Sign out the user
  const signOut = async () => {
    return supabase.auth.signOut();
  };

  return { session, user, profile, loading, signIn, signUp, signOut };
}

// Post-related hooks
export function usePosts(page = 1, pageSize = 10) {
  // Fetch posts with pagination
  const [state, setState] = useState<ResponseState<Post[]>>({
    data: [],
    loading: true,
    error: null,
  });

  // Fetch posts when the page or pageSize changes
  useEffect(() => {
    async function fetchPosts() {
      // Check if page and pageSize are valid numbers
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
          .from('posts')
          .select(
            `id, title, slug, excerpt, featured_image, published_at, profiles(id, username, display_name, avatar_url)
            `
          )
          .eq('published', true)
          .order('published_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        setState({ data: data as Post[], loading: false, error: null });
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

// Fetch a single post by slug
export function useCatagories() {
  // Fetch categories
  const [state, setState] = useState<ResponseState<Category[]>>({
    data: [],
    loading: true,
    error: null,
  });

  // Fetch categories when the component mounts
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
          `id, content, created_at, profiles(id, username, display_name, avatar_url)`
        )
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setState({ data: data as Comment[], loading: false, error: null });
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

    // Set up a real-time subscription to listen for new comments
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
      if (!postId)
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
