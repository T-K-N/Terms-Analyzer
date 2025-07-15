declare module 'axios-retry' {
    import { AxiosError, AxiosInstance } from 'axios';

    interface IAxiosRetry {
        (axios: AxiosInstance, config?: IAxiosRetryConfig): void;
        isNetworkOrIdempotentRequestError(error: AxiosError): boolean;
        exponentialDelay(retryNumber: number): number;
    }

    interface IAxiosRetryConfig {
        retries?: number;
        retryDelay?: (retryCount: number) => number;
        retryCondition?: (error: AxiosError) => boolean;
    }

    const axiosRetry: IAxiosRetry;
    export default axiosRetry;
}
