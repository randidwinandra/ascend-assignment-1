// Redis client for Deno Edge Functions using Upstash REST API
// This approach works better in Edge Functions environment

// Type declaration for Deno environment
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const upstashRequest = async (command: string[], database = 0) => {
  const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL')
  const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')
  
  if (!redisUrl || !redisToken) {
    throw new Error('Missing Redis environment variables')
  }
  
  const response = await fetch(`${redisUrl}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  
  if (!response.ok) {
    throw new Error(`Redis request failed: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.result
}

// Rate limiting functions
export const checkSurveyVoteLimit = async (surveyId: string, voterIp: string) => {
  try {
    const ipKey = `survey:${surveyId}:ip:${voterIp}`
    
    // Check if IP has already voted
    const hasVoted = await upstashRequest(['GET', ipKey])
    if (hasVoted) {
      return {
        allowed: false,
        reason: 'IP already voted',
      }
    }
    
    // Check total vote count
    const totalVotesResult = await upstashRequest(['GET', `survey:${surveyId}:total_votes`])
    const totalVotes = totalVotesResult ? parseInt(totalVotesResult) : 0
    const maxVotes = parseInt(Deno.env.get('VOTE_LIMIT_PER_SURVEY') || '100')
    
    if (totalVotes >= maxVotes) {
      return {
        allowed: false,
        reason: 'Survey vote limit reached',
      }
    }
    
    return {
      allowed: true,
      totalVotes,
      remaining: maxVotes - totalVotes,
    }
  } catch (error) {
    console.error('Redis rate limit check failed:', error)
    // Allow request if Redis is down (graceful degradation)
    return {
      allowed: true,
      totalVotes: 0,
      remaining: 100,
      redis_error: true,
    }
  }
}

// Record a vote
export const recordVote = async (surveyId: string, voterIp: string, responseData: any) => {
  try {
    const ipKey = `survey:${surveyId}:ip:${voterIp}`
    const ttl = 60 * 60 * 24 // 24 hours
    
    // Use pipeline-like approach with individual commands
    await Promise.all([
      // Mark IP as voted
      upstashRequest(['SETEX', ipKey, ttl.toString(), '1']),
      
      // Increment total votes
      upstashRequest(['INCR', `survey:${surveyId}:total_votes`]),
      
      // Cache response data
      upstashRequest(['LPUSH', `survey:${surveyId}:responses`, JSON.stringify(responseData)]),
      
      // Set expiration on vote counter
      upstashRequest(['EXPIRE', `survey:${surveyId}:total_votes`, ttl.toString()]),
      
      // Set expiration on responses list
      upstashRequest(['EXPIRE', `survey:${surveyId}:responses`, ttl.toString()]),
    ])
    
    return { success: true }
  } catch (error) {
    console.error('Redis vote recording failed:', error)
    // Don't fail the request if Redis is down
    return { success: false, redis_error: true }
  }
}

// Caching functions
export const getCachedSurvey = async (surveyId: string) => {
  try {
    const cached = await upstashRequest(['GET', `survey:${surveyId}`])
    if (cached) {
      return JSON.parse(cached)
    }
    return null
  } catch (error) {
    console.error('Redis cache get failed:', error)
    return null
  }
}

export const setCachedSurvey = async (surveyId: string, surveyData: any, ttl: number = 3600) => {
  try {
    await upstashRequest(['SETEX', `survey:${surveyId}`, ttl.toString(), JSON.stringify(surveyData)])
    return { success: true }
  } catch (error) {
    console.error('Redis cache set failed:', error)
    return { success: false, redis_error: true }
  }
}

export const getCachedSurveyByToken = async (token: string) => {
  try {
    const cached = await upstashRequest(['GET', `survey:token:${token}`])
    if (cached) {
      return JSON.parse(cached)
    }
    return null
  } catch (error) {
    console.error('Redis cache get by token failed:', error)
    return null
  }
}

export const setCachedSurveyByToken = async (token: string, surveyData: any, ttl: number = 3600) => {
  try {
    await upstashRequest(['SETEX', `survey:token:${token}`, ttl.toString(), JSON.stringify(surveyData)])
    return { success: true }
  } catch (error) {
    console.error('Redis cache set by token failed:', error)
    return { success: false, redis_error: true }
  }
}

// General rate limiting
export const checkRateLimit = async (key: string, limit: number, window: number) => {
  try {
    const now = Date.now()
    const windowStart = now - window * 1000
    
    // Remove old entries and add current request
    await upstashRequest(['ZREMRANGEBYSCORE', key, '0', windowStart.toString()])
    await upstashRequest(['ZADD', key, now.toString(), now.toString()])
    
    // Get current count
    const count = await upstashRequest(['ZCARD', key])
    
    // Set expiration
    await upstashRequest(['EXPIRE', key, window.toString()])
    
    return {
      allowed: count <= limit,
      count,
      remaining: Math.max(0, limit - count),
      resetTime: now + window * 1000,
    }
  } catch (error) {
    console.error('Redis rate limit check failed:', error)
    // Allow request if Redis is down (graceful degradation)
    return {
      allowed: true,
      count: 0,
      remaining: limit,
      resetTime: Date.now() + window * 1000,
      redis_error: true,
    }
  }
}

// Health check
export const redisHealthCheck = async () => {
  try {
    const start = Date.now()
    await upstashRequest(['PING'])
    const duration = Date.now() - start
    return {
      healthy: true,
      latency: duration,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Redis health check failed:', error)
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

// Helper function to get client IP from request
export const getClientIP = (req: Request): string => {
  const xForwardedFor = req.headers.get('X-Forwarded-For')
  const xRealIp = req.headers.get('X-Real-IP')
  const cfConnectingIp = req.headers.get('CF-Connecting-IP')
  
  if (cfConnectingIp) return cfConnectingIp
  if (xRealIp) return xRealIp
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim()
  
  return '127.0.0.1'
} 