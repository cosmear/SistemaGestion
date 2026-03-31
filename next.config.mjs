const deploymentId =
  process.env.DEPLOYMENT_VERSION ||
  process.env.NEXT_DEPLOYMENT_ID ||
  process.env.GIT_SHA ||
  process.env.GIT_HASH ||
  process.env.COMMIT_SHA ||
  process.env.SOURCE_COMMIT;

if (process.env.NODE_ENV === 'production' && !deploymentId) {
  console.warn(
    'Next.js self-hosted production build without deploymentId. Set DEPLOYMENT_VERSION or NEXT_DEPLOYMENT_ID to avoid Server Action version skew after deploys.'
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = deploymentId
  ? {
      deploymentId,
      generateBuildId: async () => deploymentId,
    }
  : {};

export default nextConfig;
