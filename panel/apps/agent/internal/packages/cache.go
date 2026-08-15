package packages

import (
	"sync"
	"time"
)

type cacheItem struct {
	value      any
	expiration time.Time
}

// MemoryCache provides a simple, concurrent in-memory key-value cache with TTL expiration.
type MemoryCache struct {
	mu    sync.RWMutex
	items map[string]cacheItem
}

// NewMemoryCache creates a new MemoryCache instance.
func NewMemoryCache() *MemoryCache {
	return &MemoryCache{
		items: make(map[string]cacheItem),
	}
}

// Get retrieves an item from cache if it exists and has not expired.
func (c *MemoryCache) Get(key string) (any, bool) {
	c.mu.RLock()
	item, ok := c.items[key]
	c.mu.RUnlock()

	if !ok {
		return nil, false
	}

	if time.Now().After(item.expiration) {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		return nil, false
	}

	return item.value, true
}

// Set stores an item in cache with a TTL duration.
func (c *MemoryCache) Set(key string, value any, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = cacheItem{
		value:      value,
		expiration: time.Now().Add(ttl),
	}
}

// Clear removes all cached items.
func (c *MemoryCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items = make(map[string]cacheItem)
}
