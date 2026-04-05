# Nginx Folder Summary for Review

## 1. What the Nginx Layer Does

The nginx layer is the first load-balancing entry point for the Smart Mess System.

It receives client traffic and forwards requests to multiple gateway instances using round-robin distribution.

This provides:

- better traffic distribution
- higher availability if one gateway instance is down
- a single public entry point for API requests

---

## 2. Nginx Folder Contents

The nginx folder currently contains one main configuration file:

- [nginx/nginx.conf](nginx/nginx.conf)

Related implementation and usage docs:

- [LOAD_BALANCER_README.md](LOAD_BALANCER_README.md)
- [LOAD_BALANCER_SETUP_COMPLETE.md](LOAD_BALANCER_SETUP_COMPLETE.md)

---

## 3. Configuration Overview

### File: [nginx/nginx.conf](nginx/nginx.conf)

This file defines worker settings, logging, an upstream gateway pool, and proxy behavior.

Key server behavior:

- listens on port 8080
- proxies incoming requests to gateway upstream
- includes proxy headers for forwarded client context
- sets request/connection/buffer timeouts
- exposes a lightweight health endpoint
- blocks access to hidden files

---

## 4. Upstream Gateway Pool

### Upstream name

gateway_backend

### Gateway instances behind nginx

- localhost:5000
- localhost:5010
- localhost:5020

The pool uses round-robin balancing by default and includes fail handling:

- max_fails set to 3
- fail_timeout set to 10s

It also enables keepalive upstream connections for better performance.

---

## 5. Reverse Proxy Rules

### Main location

Path: /

Behavior:

- forwards all requests to the gateway upstream
- uses HTTP/1.1 for proxying
- forwards host and client-ip headers
- includes X-Forwarded-For and X-Forwarded-Proto
- sets proxy connect/send/read timeouts to 60 seconds
- enables proxy buffering with explicit buffer sizes

### Health endpoint

Path: /health

Behavior:

- returns HTTP 200 with plain text response
- disables access log for the endpoint

### Security location

Pattern blocks access to hidden dot-files.

---

## 6. Request Flow Through Nginx

Typical flow:

1. Client sends request to localhost:8080.
2. Nginx selects one gateway instance from 5000, 5010, 5020.
3. Selected gateway instance routes request to a backend service instance.
4. Service response returns through gateway and then nginx.

This is the first layer in the project two-layer load-balancing architecture.

---

## 7. How Nginx Connects to Gateway Layer

Gateway-side load balancing is implemented in:

- [gateway/load-balancer.js](gateway/load-balancer.js)
- [gateway/server.js](gateway/server.js)

Together, the flow becomes:

- Layer 1: Nginx distributes traffic to gateway instances.
- Layer 2: Gateway distributes traffic to service instances.

This separation keeps edge traffic handling and internal service balancing cleanly separated.

---

## 8. Operational Notes

From project docs:

- startup and shutdown automation is provided by [start-all-services.ps1](start-all-services.ps1) and [stop-all-services.ps1](stop-all-services.ps1)
- detailed run and troubleshooting instructions are in [LOAD_BALANCER_README.md](LOAD_BALANCER_README.md)

For review/demo explanation, emphasize:

- nginx is the external ingress point
- gateway pool provides horizontal scaling entry
- failures in one gateway instance do not stop traffic

---

## 9. Review Talking Points

Use these points during viva or project review:

- The nginx folder centralizes edge proxy and layer-1 balancing.
- Nginx upstream contains three gateway instances for resilience.
- Health and timeout settings are configured for production-like behavior.
- The architecture supports scaling by adding more gateway ports and updating upstream configuration.

---

## 10. Short Summary

The nginx folder provides a concise but important part of the system: first-hop reverse proxy and load balancing to gateway instances.

Even though the folder has one main file, that file controls traffic entry, request forwarding, health response behavior, and edge-level reliability for the full microservice stack.