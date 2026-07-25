import { useOverview } from './useOverview';

/**
 * A convenience hook that extracts usage-specific metrics from the overview response,
 * mapping them to billing/usage domain terms.
 */
export const useUsage = () => {
  const { data, isLoading, isError, error } = useOverview('30d');

  if (!data) {
    return {
      data: null,
      isLoading,
      isError,
      error,
    };
  }

  // Parse shieldedRequests which is a string like "1,234"
  const rawRequests = parseInt(data.metrics.shieldedRequests.replace(/,/g, ''), 10) || 0;
  
  // Calculate tier limits and overage (simulated for UI based on total requests)
  const tierLimit = 2000000; // 2M
  const remaining = Math.max(0, tierLimit - rawRequests);
  const overage = rawRequests > tierLimit ? (rawRequests - tierLimit) * 0.0001 : 0;

  return {
    data: {
      requestsThisMonth: data.metrics.shieldedRequests,
      blockedThreats: data.metrics.blockedThreats,
      highSeverityInjections: data.metrics.highSeverityInjections,
      remainingCredits: (remaining / 1000).toFixed(1) + 'k',
      overageAmount: '$' + overage.toFixed(2),
      isOverlimit: rawRequests > tierLimit,
    },
    isLoading,
    isError,
    error,
  };
};
