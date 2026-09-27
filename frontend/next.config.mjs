import CopyWebpackPlugin from "copy-webpack-plugin";
import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      const cesiumSource = path.join(
        process.cwd(),
        "node_modules/cesium/Build/Cesium"
      );

      const cesiumPublicDir = path.join(
        process.cwd(),
        "public",
        "cesium"
      );

      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: path.join(cesiumSource, "Workers"),
              to: path.join(cesiumPublicDir, "Workers"),
            },
            {
              from: path.join(cesiumSource, "ThirdParty"),
              to: path.join(cesiumPublicDir, "ThirdParty"),
            },
            {
              from: path.join(cesiumSource, "Assets"),
              to: path.join(cesiumPublicDir, "Assets"),
            },
            {
              from: path.join(cesiumSource, "Widgets"),
              to: path.join(cesiumPublicDir, "Widgets"),
            },
          ],
        }),
        new webpack.DefinePlugin({
          CESIUM_BASE_URL: JSON.stringify("/cesium"),
        })
      );

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

  // Prevent Next.js production optimization from choking
  // on Cesium's pre-built worker files.
  swcMinify: false,
};

export default nextConfig;