import Redis from 'ioredis'

let redis

export const getRedis = () => {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    })
    redis.on('connect', () => console.log('Redis connected'))
    redis.on('error', (err) => console.error('Redis error:', err.message))
  }
  return redis
}
