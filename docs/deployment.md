# Portal container deployment

The portal is built from this repository with a pinned Node build image and served by a pinned Nginx image. The build requires the public API base URL as a build argument; local `.env` files are excluded from the Docker build context.

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.org/api/v1 \
  -t somnguard-portal:local .

docker run -d --name somnguard-portal-check -p 127.0.0.1:18080:80 somnguard-portal:local
curl --fail http://127.0.0.1:18080/healthz
curl --fail http://127.0.0.1:18080/admin/security/users
docker rm -f somnguard-portal-check
```

The SPA fallback in `nginx/default.conf` serves `index.html` for client-side routes while missing `/assets/*` files remain 404s. The image health check requests `/healthz` over HTTP. API URLs are compiled into the static bundle by Vite; pass the correct URL for the environment at build time. The container does not proxy API calls, so the API's CORS policy must allow the portal's public origin.
