import { useEffect, useState } from "react";
import { getAuthHeaders } from "../auth";

let cachedLabContext = null;

export function useLabContext() {
  const [labContext, setLabContext] = useState(cachedLabContext);
  const [loading, setLoading] = useState(!cachedLabContext);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    if (cachedLabContext) {
      return () => {
        isMounted = false;
      };
    }

    async function loadLabContext() {
      try {
        const response = await fetch("/api/labs/context", {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Live lab data could not be loaded.");
        }

        const data = await response.json();
        cachedLabContext = data;

        if (isMounted) {
          setLabContext(data);
          setError("");
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadLabContext();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    labContext,
    loading,
    error,
  };
}
