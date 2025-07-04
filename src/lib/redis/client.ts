import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL!
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN!

if (!redisUrl || !redisToken) {
  throw new Error('Missing Redis environment variables')
}

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
  retry: {
    retries: 3,
    backoff: (retryCount) => Math.exp(retryCount) * 50,
  },
})

// Rate limiting functions
export const checkRateLimit = async (key: string, limit: number, window: number) => {
  const now = Date.now()
  const windowStart = now - window * 1000

  // Use Redis pipeline for atomic operations
  const pipeline = redis.pipeline()
  
  // Remove old entries
  pipeline.zremrangebyscore(key, 0, windowStart)
  
  // Add current request
  pipeline.zadd(key, { score: now, member: now })
  
  // Get current count
  pipeline.zcard(key)
  
  // Set expiration
  pipeline.expire(key, window)
  
  const results = await pipeline.exec()
  const count = results[2] as number

  return {
    allowed: count <= limit,
    count,
    remaining: Math.max(0, limit - count),
    resetTime: now + window * 1000,
  }
}

// Survey-specific rate limiting
export const checkSurveyVoteLimit = async (surveyId: string, voterIp: string) => {
  const ipKey = `survey:${surveyId}:ip:${voterIp}`
  
  // Check if IP has already voted
  const hasVoted = await redis.get(ipKey)
  if (hasVoted) {
    return {
      allowed: false,
      reason: 'IP already voted',
    }
  }
  
  // Check total vote count
  const totalVotesResult = await redis.get(`survey:${surveyId}:total_votes`)
  const totalVotes = totalVotesResult ? parseInt(totalVotesResult as string) : 0
  const maxVotes = parseInt(process.env.VOTE_LIMIT_PER_SURVEY || '100')
  
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
}

// Record a vote
export const recordVote = async (surveyId: string, voterIp: string, responseData: any) => {
  const pipeline = redis.pipeline()
  
  // Mark IP as voted
  pipeline.set(`survey:${surveyId}:ip:${voterIp}`, '1', { ex: 60 * 60 * 24 * 7 }) // 7 days
  
  // Increment total votes
  pipeline.incr(`survey:${surveyId}:total_votes`)
  
  // Cache response data
  pipeline.lpush(`survey:${surveyId}:responses`, JSON.stringify(responseData))
  
  // Set survey data expiration
  pipeline.expire(`survey:${surveyId}:total_votes`, 60 * 60 * 24 * 7) // 7 days
  pipeline.expire(`survey:${surveyId}:responses`, 60 * 60 * 24 * 7) // 7 days
  
  await pipeline.exec()
}

// Caching functions
export const getCachedSurvey = async (surveyId: string) => {
  const cached = await redis.get(`survey:${surveyId}`)
  if (cached) {
    return JSON.parse(cached as string)
  }
  return null
}

export const setCachedSurvey = async (surveyId: string, surveyData: any, ttl: number = 3600) => {
  await redis.set(`survey:${surveyId}`, JSON.stringify(surveyData), { ex: ttl })
}

export const getCachedSurveyByToken = async (token: string) => {
  const cached = await redis.get(`survey:token:${token}`)
  if (cached) {
    return JSON.parse(cached as string)
  }
  return null
}

export const setCachedSurveyByToken = async (token: string, surveyData: any, ttl: number = 3600) => {
  await redis.set(`survey:token:${token}`, JSON.stringify(surveyData), { ex: ttl })
}

export const getCachedAnalytics = async (surveyId: string) => {
  const cached = await redis.get(`analytics:${surveyId}`)
  if (cached) {
    return JSON.parse(cached as string)
  }
  return null
}

export const setCachedAnalytics = async (surveyId: string, analytics: any, ttl: number = 300) => {
  await redis.set(`analytics:${surveyId}`, JSON.stringify(analytics), { ex: ttl })
}

// Session management
export const createSession = async (sessionId: string, userData: any, ttl: number = 3600) => {
  await redis.set(`session:${sessionId}`, JSON.stringify(userData), { ex: ttl })
}

export const getSession = async (sessionId: string) => {
  const session = await redis.get(`session:${sessionId}`)
  if (session) {
    return JSON.parse(session as string)
  }
  return null
}

export const deleteSession = async (sessionId: string) => {
  await redis.del(`session:${sessionId}`)
}

// Survey expiration management
export const setSurveyExpiration = async (surveyId: string, expirationTime: number) => {
  await redis.set(`survey:${surveyId}:expires`, expirationTime)
  await redis.expire(`survey:${surveyId}:expires`, expirationTime - Date.now())
}

export const checkSurveyExpiration = async (surveyId: string) => {
  const expirationTime = await redis.get(`survey:${surveyId}:expires`)
  if (!expirationTime) {
    return { expired: false }
  }
  
  const now = Date.now()
  const expired = now > (expirationTime as number)
  
  return {
    expired,
    expiresAt: expirationTime,
    timeRemaining: expired ? 0 : (expirationTime as number) - now,
  }
}

// Performance monitoring
export const recordPerformanceMetric = async (metric: string, value: number, tags?: Record<string, string>) => {
  const key = `perf:${metric}`
  const now = Date.now()
  const data = { value, timestamp: now, tags }
  
  await redis.lpush(key, JSON.stringify(data))
  await redis.ltrim(key, 0, 999) // Keep last 1000 entries
  await redis.expire(key, 60 * 60 * 24) // 24 hours
}

export const getPerformanceMetrics = async (metric: string, limit: number = 100) => {
  const key = `perf:${metric}`
  const data = await redis.lrange(key, 0, limit - 1)
  return data.map(item => JSON.parse(item as string))
}

// Health check
export const healthCheck = async () => {
  try {
    const start = Date.now()
    await redis.ping()
    const duration = Date.now() - start
    
    return {
      status: 'healthy',
      responseTime: duration,
      timestamp: Date.now(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }
  }
}

// Cleanup expired data
export const cleanupExpiredData = async () => {
  const now = Date.now()
  const keys = await redis.keys('survey:*:expires')
  
  for (const key of keys) {
    const expirationTime = await redis.get(key)
    if (expirationTime && now > (expirationTime as number)) {
      const surveyId = key.split(':')[1]
      
      // Remove expired survey data
      await redis.del(
        `survey:${surveyId}:expires`,
        `survey:${surveyId}:total_votes`,
        `survey:${surveyId}:responses`,
        `survey:${surveyId}`,
        `analytics:${surveyId}`
      )
      
      // Remove IP tracking for expired survey
      const ipKeys = await redis.keys(`survey:${surveyId}:ip:*`)
      if (ipKeys.length > 0) {
        await redis.del(...ipKeys)
      }
    }
  }
}

// Error handling
export const handleRedisError = (error: any) => {
  console.error('Redis error:', error)
  
  if (error.code === 'ECONNREFUSED') {
    return 'Redis connection refused'
  }
  
  if (error.code === 'ENOTFOUND') {
    return 'Redis server not found'
  }
  
  if (error.code === 'ETIMEDOUT') {
    return 'Redis connection timeout'
  }
  
  return error.message || 'Redis operation failed'
} 