let processEnvShim = () => ({
  CAPI_SERVER: undefined,
  CAPI_TARGET: undefined,
});
export { processEnvShim as "process.env" };
