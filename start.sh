#!/bin/bash

# Start NGINX in background (listens on port 80)
nginx &

# Override Azure's PORT=80 so Next.js doesn't conflict with nginx
export PORT=3000
export HOSTNAME=0.0.0.0

# Start Next.js standalone server on port 3000
cd /app
exec node .next/standalone/server.js
