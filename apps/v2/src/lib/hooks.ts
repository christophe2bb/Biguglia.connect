import { useEffect, useRef, useState } from "react";
import { errorText } from "./client";
export function useQuery<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(enabled);
  const [revision, setRevision] = useState(0);
  const latest = useRef(load);
  latest.current = load;
  useEffect(() => {
    const abort = new AbortController();
    setData(null);
    setError("");
    setLoading(enabled);
    if (!enabled) return;
    void latest
      .current(abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(errorText(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [key, revision, enabled]);
  return { data, loading, error, reload: () => setRevision((x) => x + 1) };
}
export function useDebounce(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
