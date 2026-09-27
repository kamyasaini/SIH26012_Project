import CopyWebpackPlugin from "copy-webpack-plugin";
import path from "path";

const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumPublicDir = path.join(process.cwd(), "public", "cesium");

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Cesium ships its Workers/Assets/Widgets/ThirdParty as static files
      // that are loaded at runtime (e.g. via Web Workers), not bundled by
      // webpack. Copy them into /public so Next.js serves them as-is.
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            { from: path.join(cesiumSource, "Workers"), to: path.join(cesiumPublicDir, "Workers") },
            { from: path.join(cesiumSource, "ThirdParty"), to: path.join(cesiumPublicDir, "ThirdParty") },
            { from: path.join(cesiumSource, "Assets"), to: path.join(cesiumPublicDir, "Assets") },
            { from: path.join(cesiumSource, "Widgets"), to: path.join(cesiumPublicDir, "Widgets") },
          ],
        }),
        new webpack.DefinePlugin({
          CESIUM_BASE_URL: JSON.stringify("/cesium"),
        }),
      );

      // Cesium contains a few conditional Node-only code paths that
      // webpack tries (and fails) to resolve in the browser bundle.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
      };
      config.module.unknownContextCritical = false;
    }
    return config;
  },
};

export default nextConfig;
