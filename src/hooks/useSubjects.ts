import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:3001";

interface Subject {
  id: string;
  name: string;
  code: string;
  term?: string;
  lectureIds?: string[];
  recordings?: number;
  createdAt?: any;
  updatedAt?: any;
}

// Cache for subjects to avoid unnecessary refetches
let subjectsCache: Subject[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Event listeners for cache invalidation
type CacheInvalidationListener = () => void;
const cacheInvalidationListeners: Set<CacheInvalidationListener> = new Set();

/**
 * Hook to fetch all subjects with caching
 */
export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // Use cache if available and not expired
    if (!forceRefresh && subjectsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      setSubjects(subjectsCache);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(`${API_BASE_URL}/subjects`);
      const data = res.data || [];

      // Update cache
      subjectsCache = data;
      cacheTimestamp = now;

      setSubjects(data);
    } catch (err: any) {
      console.error("Error fetching subjects:", err);
      setError(err.message || "Failed to fetch subjects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();

    // Register listener for cache invalidation
    const listener = () => {
      fetchSubjects(true);
    };
    cacheInvalidationListeners.add(listener);

    // Cleanup: remove listener when component unmounts
    return () => {
      cacheInvalidationListeners.delete(listener);
    };
  }, [fetchSubjects]);

  return {
    subjects,
    loading,
    error,
    refetch: () => fetchSubjects(true),
  };
}

/**
 * Hook to fetch a single subject by ID
 */
export function useSubject(subjectId: string | null) {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) {
      setSubject(null);
      setLoading(false);
      return;
    }

    const fetchSubject = async () => {
      setLoading(true);
      setError(null);

      try {
        // First check if we have it in cache
        if (subjectsCache) {
          const cached = subjectsCache.find((s) => s.id === subjectId);
          if (cached) {
            setSubject(cached);
            setLoading(false);
            return;
          }
        }

        // Fetch single subject from API
        const res = await axios.get(`${API_BASE_URL}/subjects/${subjectId}`);
        setSubject(res.data);
      } catch (err: any) {
        console.error("Error fetching subject:", err);
        setError(err.message || "Failed to fetch subject");
        setSubject(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubject();
  }, [subjectId]);

  return {
    subject,
    loading,
    error,
  };
}

/**
 * Invalidate the subjects cache and notify all listeners to refetch
 */
export function invalidateSubjectsCache() {
  subjectsCache = null;
  cacheTimestamp = 0;

  // Notify all listeners to refetch
  cacheInvalidationListeners.forEach(listener => listener());
}
