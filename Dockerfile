# Use the official Redis image as the base image
FROM redis:latest

# Optionally, you can add any custom configuration files or scripts here
# For example, if you have a custom redis.conf file:
# COPY redis.conf /usr/local/etc/redis/redis.conf

# Expose Redis default port
EXPOSE 6379

# Start Redis server
CMD ["redis-server"]
