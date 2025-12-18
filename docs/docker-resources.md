# Docker Resource Configuration

## Current Resource Allocation

### Production Environment (`compose.prod.yml`)

```yaml
resources:
  limits:
    cpus: '1.0' # Maximum 1 CPU core
    memory: 512M # Maximum 512MB RAM
  reservations:
    cpus: '0.25' # Minimum 0.25 CPU cores reserved
    memory: 256M # Minimum 256MB RAM reserved
```

### QA Environment (`compose.qa.yml`)

```yaml
resources:
  limits:
    cpus: '0.75' # Maximum 0.75 CPU cores
    memory: 384M # Maximum 384MB RAM
  reservations:
    cpus: '0.15' # Minimum 0.15 CPU cores reserved
    memory: 192M # Minimum 192MB RAM reserved
```

## Resource Breakdown

### Memory Usage (NestJS + Prisma + GraphQL)

| Component          | Baseline Memory |
| ------------------ | --------------- |
| NestJS Runtime     | ~100-150MB      |
| Prisma Client      | ~50-100MB       |
| GraphQL Schema     | ~30-50MB        |
| Request Buffers    | ~100-200MB      |
| **Total Baseline** | **~280-500MB**  |

### CPU Usage Patterns

- **Idle**: 5-10% CPU usage
- **Light Load** (10-50 req/min): 15-25% CPU
- **Medium Load** (50-200 req/min): 30-50% CPU
- **High Load** (200-500 req/min): 60-80% CPU
- **Peak Load** (500+ req/min): 80-100% CPU

## Performance Expectations

### Current Configuration Handles:

- **Production**: ~1000-2000 requests/minute
- **QA**: ~500-1000 requests/minute

### Request Processing Times:

- Simple queries: 5-50ms
- Complex queries with joins: 100-300ms
- Mutations with database writes: 50-150ms

## Scaling Guidelines

### When to Scale Up

#### Increase Memory if:

- Container frequently hits memory limit
- OOM (Out of Memory) errors in logs
- Slow garbage collection
- Memory usage consistently >80%

#### Increase CPU if:

- Request response times >500ms consistently
- CPU usage consistently >80%
- Event loop lag >100ms
- Request queue building up

### Recommended Scaling Tiers

#### Tier 1 - Current (Small Subgraph)

```yaml
Production:
  cpus: '1.0'
  memory: 512M

QA:
  cpus: '0.75'
  memory: 384M
```

**Best for**: <2000 req/min, simple queries

#### Tier 2 - Medium Traffic

```yaml
Production:
  cpus: '1.5'
  memory: 768M

QA:
  cpus: '1.0'
  memory: 512M
```

**Best for**: 2000-5000 req/min, moderate complexity

#### Tier 3 - High Traffic

```yaml
Production:
  cpus: '2.0'
  memory: 1G

QA:
  cpus: '1.5'
  memory: 768M
```

**Best for**: 5000-10000 req/min, complex queries

#### Tier 4 - Very High Traffic

```yaml
Production:
  cpus: '3.0'
  memory: 2G

QA:
  cpus: '2.0'
  memory: 1G
```

**Best for**: >10000 req/min, heavy database operations

## Monitoring

### Monitor Resource Usage

```bash
# Real-time stats
docker stats ekoru-blog-community

# Continuous monitoring
docker stats ekoru-blog-community --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Key Metrics to Watch

1. **CPU %**: Should stay <80% average
2. **Memory Usage**: Should stay <80% of limit
3. **Network I/O**: Monitor for bottlenecks
4. **PIDs**: Number of processes/threads

### Container Logs

```bash
# Check for OOM or performance issues
docker logs ekoru-blog-community --tail 100 -f

# Check for memory warnings
docker logs ekoru-blog-community 2>&1 | grep -i "memory\|oom"
```

## Health Check Configuration

The health check ensures the container is responding properly:

```yaml
healthcheck:
  test:
    [
      'CMD',
      'wget',
      '--quiet',
      '--tries=1',
      '--spider',
      'http://localhost:9004/graphql',
    ]
  interval: 30s # Check every 30 seconds
  timeout: 10s # Fail if no response in 10s
  retries: 3 # Mark unhealthy after 3 failures
  start_period: 40s # Grace period during startup
```

### Health Check States

- **Healthy**: GraphQL endpoint responding
- **Unhealthy**: 3 consecutive failures (container will restart)
- **Starting**: Within 40s grace period

## Optimization Tips

### Application Level

1. **Enable Prisma Query Caching**
   - Reduces database load
   - Lowers memory usage

2. **Implement DataLoader**
   - Batch database queries
   - Reduces N+1 query problems

3. **Add Query Complexity Limits**
   - Prevent expensive queries
   - Protect resources

4. **Enable Compression**
   - Reduces network I/O
   - Lowers bandwidth usage

### Docker Level

1. **Use Multi-Stage Builds** ✅ (Already implemented)
   - Smaller image size
   - Faster deployments

2. **Run as Non-Root User** ✅ (Already implemented)
   - Better security
   - Prevents privilege escalation

3. **Volume Mounts for Logs**
   - Persistent logging
   - Better debugging

## Troubleshooting

### Container Keeps Restarting

1. Check health check logs
2. Verify DATABASE_URL is accessible
3. Check memory limits (may need increase)
4. Review application startup logs

### Slow Performance

1. Monitor CPU/Memory usage
2. Check database connection pool
3. Review slow query logs
4. Consider horizontal scaling (multiple instances)

### Out of Memory Errors

1. Increase memory limit
2. Check for memory leaks in application
3. Review Prisma connection pool size
4. Monitor garbage collection

## Best Practices

1. **Always set both limits and reservations**
   - Ensures minimum guaranteed resources
   - Prevents resource starvation

2. **QA should mirror production** (at ~75% capacity)
   - Realistic testing environment
   - Catches performance issues early

3. **Monitor before scaling**
   - Use actual metrics to guide decisions
   - Avoid over-provisioning

4. **Test with realistic load**
   - Use load testing tools
   - Simulate production traffic patterns

5. **Plan for peaks**
   - Set limits with 20% headroom
   - Allow for traffic spikes

## Related Files

- `compose.prod.yml` - Production configuration
- `compose.qa.yml` - QA/Staging configuration
- `Dockerfile` - Container build configuration
- `.dockerignore` - Build context exclusions
