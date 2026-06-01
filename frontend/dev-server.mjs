import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const server = await createServer({
  configFile: false,
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 8002,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/predict": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/prediction-history": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/ml-health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});

await server.listen();
server.printUrls();
