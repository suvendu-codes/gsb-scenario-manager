"use client";

import { useCallback, useState } from "react";
import api from "@/lib/axios";
import { AxiosRequestConfig, AxiosError } from "axios";

function getErrorMessage(error: unknown) {
    if (error instanceof AxiosError) {
        return error.response?.data?.message || error.message;
    }

    return error instanceof Error ? error.message : "Request failed";
}

export function useApi<T>() {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const request = useCallback(async (config: AxiosRequestConfig) => {
        setLoading(true);
        setError(null);

        try {
            const response = await api<T>(config);
            setData(response.data);
            return response.data;
        } catch (requestError) {
            setError(getErrorMessage(requestError));
            throw requestError;
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, loading, error, request };
}