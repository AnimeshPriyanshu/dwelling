# Cache

Cache access is isolated here so request handlers and domain logic do not depend
directly on Redis. Redis is optional during early local development.
