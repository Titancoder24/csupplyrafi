const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('lottie');

// Limit worker concurrency to avoid OOM on Windows with low page-file commit
config.maxWorkers = 1;

module.exports = withNativeWind(config, { input: './global.css' });
