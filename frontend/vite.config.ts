import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const proxy = { '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:8080', changeOrigin: true } };
    return {
        server: {
            host: '127.0.0.1',
            port: 5173,
            strictPort: true,
            proxy,
        },
        preview: { host: '127.0.0.1', proxy },
        plugins: [
            tailwindcss(),
            react(),
            babel({ presets: [reactCompilerPreset()] }),
        ],
    };
});
