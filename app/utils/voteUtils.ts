/**
 * Utility functions for vote value mapping and calculations
 * 
 * This module handles the transition from old vote values to new vote values:
 * - Old system (before cutoff): 'true'=2, 'probably true'=1, 'neutral'=0, 'probably false'=-1, 'voted false'=-2
 * - New system (after cutoff): 'true'=10, 'probably true'=7.5, 'neutral'=5, 'probably false'=2.5, 'voted false'=0
 * 
 * Cutoff date: Votes created before this date use old mapping, after use new mapping
 */
const VOTE_SYSTEM_CUTOFF_DATE = new Date('2025-01-20T00:00:00Z'); // Update this when deploying

/**
 * Get the numeric value for a vote string based on whether it's old or new system
 */
export function getVoteNumericValue(vote: string, voteDate: Date | null | undefined): number {
  // If voteDate is null/undefined, assume it's an old vote (before createdAt was added)
  const isOldVote = !voteDate || voteDate < VOTE_SYSTEM_CUTOFF_DATE;
  
  if (isOldVote) {
    // Old system mapping
    switch (vote) {
      case 'true':
        return 2;
      case 'probably true':
        return 1;
      case 'neutral':
        return 0;
      case 'probably false':
        return -1;
      case 'voted false':
        return -2;
      default:
        return 0;
    }
  } else {
    // New system mapping
    switch (vote) {
      case 'true':
        return 10;
      case 'probably true':
        return 7.5;
      case 'neutral':
        return 5;
      case 'probably false':
        return 2.5;
      case 'voted false':
        return 0;
      default:
        return 0;
    }
  }
}

/**
 * Calculate the average vote score from an array of vote records
 * Returns the average as a number, or null if no votes exist
 */
export function calculateAverageVoteScore(votes: Array<{ vote: string; createdAt?: Date | null }>): number | null {
  if (!votes || votes.length === 0) {
    return null;
  }

  const total = votes.reduce((sum, voteRecord) => {
    const numericValue = getVoteNumericValue(voteRecord.vote, voteRecord.createdAt);
    return sum + numericValue;
  }, 0);

  return total / votes.length;
}

/**
 * Calculate average vote scores for multiple posts
 * Takes a map of postId -> votes array and returns a map of postId -> average score
 */
export function calculateAverageVoteScoresForPosts(
  votesByPostId: Record<string, Array<{ vote: string; createdAt?: Date | null }>>
): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  
  for (const [postId, votes] of Object.entries(votesByPostId)) {
    result[postId] = calculateAverageVoteScore(votes);
  }
  
  return result;
}

