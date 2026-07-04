'use client';

import { useEffect, useState } from 'react';
import { setCanChangeKeys, setLLMConfig } from '@/store/slices/userConfig';
import { hasValidLLMConfig, normalizeLLMConfig } from '@/utils/storeHelpers';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { isOllamaModelAvailable } from '@/utils/providerUtils';
import { LLMConfig } from '@/types/llm_config';
import { getApiUrl } from '@/utils/api';
import { notify } from '@/components/ui/sonner';

export function ConfigurationInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  const route = usePathname();
  const [isLoading, setIsLoading] = useState(
    () => !route?.startsWith("/pdf-maker")
  );
  const router = useRouter();

  // Fetch user config state
  useEffect(() => {
    fetchUserConfigState();
  }, []);

  const setLoadingToFalseAfterNavigatingTo = (pathname: string) => {
    if (window.location.pathname === pathname) {
      setIsLoading(false);
      return;
    }

    const interval = setInterval(() => {
      if (window.location.pathname === pathname) {
        clearInterval(interval);
        setIsLoading(false);
      }
    }, 500);
  }

  const fetchUserConfigState = async () => {
    if (route.startsWith("/pdf-maker")) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let canChangeKeys = false;
    try {
      if (window.electron?.getCanChangeKeys) {
        canChangeKeys = await window.electron.getCanChangeKeys();
      } else {
        const res = await fetch('/api/can-change-keys');
        const data = await res.json();
        canChangeKeys = data.canChange ?? false;
      }
    } catch (e) {
      console.error('Failed to fetch can-change-keys:', e);
      canChangeKeys = false;
    }
    dispatch(setCanChangeKeys(canChangeKeys));

    if (canChangeKeys) {
      let llmConfig: LLMConfig = {};
      try {
        if (window.electron?.getUserConfig) {
          llmConfig = await window.electron.getUserConfig();
        } else {
          const res = await fetch('/api/user-config');
          llmConfig = await res.json();
        }
      } catch (e) {
        console.error('Failed to fetch user config:', e);
        llmConfig = {};
      }
      if (!llmConfig.LLM) {
        llmConfig.LLM = 'openai';
      }
      llmConfig = normalizeLLMConfig(llmConfig);

      dispatch(setLLMConfig(llmConfig));

      const isValid = hasValidLLMConfig(llmConfig);
      if (route.startsWith('/pdf-maker')) {
        setIsLoading(false);
        return;
      }
      if (isValid) {
        // Check if the selected Ollama model is pulled
        if (llmConfig.LLM === 'ollama' && llmConfig.OLLAMA_MODEL) {
          let isAvailable = false;
          try {
            isAvailable = await isOllamaModelAvailable(
              llmConfig.OLLAMA_MODEL,
              llmConfig.OLLAMA_URL
            );
          } catch (error) {
            notify.error(
              "Could not connect to Ollama",
              error instanceof Error ? error.message : "Check the Ollama URL and try again."
            );
          }
          if (!isAvailable) {
            router.push('/');
            setLoadingToFalseAfterNavigatingTo('/');
            return;
          }
        }
        if (llmConfig.LLM === 'custom') {
          const isAvailable = await checkIfSelectedCustomModelIsAvailable(llmConfig);
          if (!isAvailable) {
            router.push('/');
            setLoadingToFalseAfterNavigatingTo('/');
            return;
          }
        }
        if (llmConfig.LLM === 'deepseek') {
          const isAvailable = await checkIfSelectedDeepSeekModelIsAvailable(llmConfig);
          if (!isAvailable) {
            router.push('/');
            setLoadingToFalseAfterNavigatingTo('/');
            return;
          }
        }
        if (route === '/') {
          router.push('/upload');
          setLoadingToFalseAfterNavigatingTo('/upload');
        } else {
          setIsLoading(false);
        }
      } else if (route !== '/') {
        router.push('/');
        setLoadingToFalseAfterNavigatingTo('/');
      } else {
        setIsLoading(false);
      }
    } else {
      if (route === '/') {
        router.push('/upload');
        setLoadingToFalseAfterNavigatingTo('/upload');
      } else {
        setIsLoading(false);
      }
    }
  }


  const checkIfSelectedCustomModelIsAvailable = async (llmConfig: LLMConfig) => {
    try {
      const response = await fetch(getApiUrl('/api/v1/ppt/openai/models/available'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: llmConfig.CUSTOM_LLM_URL,
          api_key: llmConfig.CUSTOM_LLM_API_KEY,
        }),
      });
      const data = await response.json();
      return data.includes(llmConfig.CUSTOM_MODEL);
    } catch (error) {
      console.error('Error fetching custom models:', error);
      return false;
    }
  }

  const checkIfSelectedDeepSeekModelIsAvailable = async (llmConfig: LLMConfig) => {
    try {
      const response = await fetch(getApiUrl('/api/v1/ppt/openai/models/available'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: llmConfig.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
          api_key: llmConfig.DEEPSEEK_API_KEY,
        }),
      });
      const data = await response.json();
      return data.includes(llmConfig.DEEPSEEK_MODEL);
    } catch (error) {
      console.error('Error fetching DeepSeek models:', error);
      return false;
    }
  }


  if (isLoading) {
    // Sin cartel de inicio: solo un indicador mínimo mientras se resuelve
    // la configuración y el ruteo inicial.
    return (
      <div className="flex min-h-screen items-center justify-center bg-white" aria-busy="true">
        <div className="flex space-x-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#e25a4e]"></div>
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#ef8175]" style={{ animationDelay: '0.2s' }}></div>
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#e25a4e]" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
  }

  return children;
}
