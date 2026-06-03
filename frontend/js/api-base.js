const API_ORIGIN = (() => {
  const defaultLocalApi = "http://localhost:5000";
  const { protocol, hostname, port } = window.location;
  const localHosts = ["localhost", "127.0.0.1", ""];

  if (protocol === "file:") return defaultLocalApi;
  if (localHosts.includes(hostname) && port !== "5000") return defaultLocalApi;

  return "";
})();
