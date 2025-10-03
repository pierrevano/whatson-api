const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const { CookieJar } = require("tough-cookie");

const { config } = require("../config");

const jar = new CookieJar();
const httpClient = axios.create({ withCredentials: true });

const resolveURL = (requestConfig = {}) => {
  const { url, baseURL } = requestConfig;

  if (!url) return null;
  try {
    if (url.startsWith("http")) return url;
    if (baseURL) {
      return new URL(url, baseURL).toString();
    }
  } catch (_) {
    return null;
  }

  return url;
};

httpClient.interceptors.request.use((requestConfig) => {
  const resolvedUrl = resolveURL(requestConfig);

  if (!requestConfig.metadata) requestConfig.metadata = {};
  requestConfig.metadata.url = resolvedUrl;

  if (resolvedUrl) {
    const cookies = jar.getCookieStringSync(resolvedUrl);
    if (cookies) {
      requestConfig.headers = requestConfig.headers || {};
      requestConfig.headers.Cookie = cookies;
    }
  }

  return requestConfig;
});

httpClient.interceptors.response.use((response) => {
  const resolvedUrl = resolveURL(response?.config);
  const setCookieHeader = response?.headers?.["set-cookie"];

  if (resolvedUrl && setCookieHeader) {
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : [setCookieHeader];

    cookies.forEach((cookieHeader) => {
      try {
        jar.setCookieSync(cookieHeader, resolvedUrl);
      } catch (_) {}
    });
  }

  return response;
});

axiosRetry(httpClient, {
  retries: config.retries,
  retryDelay: () => config.retryDelay,
  retryCondition: (error) =>
    !error.response ||
    (error.response.status !== 404 && error.response.status >= 500),
  onRetry: (retryCount, error, requestConfig) => {
    const retryInfo = {
      origin: requestConfig?.metadata?.origin || "N/A",
      url: requestConfig?.metadata?.url || requestConfig?.url || "N/A",
      userAgent: requestConfig?.headers?.["User-Agent"] || "N/A",
      errorCode: error.response?.status || "Network Error",
      ipAddress: error.response?.headers?.["x-forwarded-for"] || "N/A",
      requestHeaders: requestConfig?.headers,
      responseHeaders: error.response?.headers,
      retryCount,
    };

    if (retryInfo.errorCode !== 404) {
      console.log(
        `Retrying due to error:\n` +
          `Attempt: ${retryInfo.retryCount}\n` +
          `Origin: ${retryInfo.origin}\n` +
          `URL: ${retryInfo.url}\n` +
          `Error Code: ${retryInfo.errorCode}\n` +
          `User-Agent: ${retryInfo.userAgent}\n` +
          `IP Address: ${retryInfo.ipAddress}\n` +
          `Request Headers: ${JSON.stringify(retryInfo.requestHeaders, null, 2)}\n` +
          `Response Headers: ${JSON.stringify(retryInfo.responseHeaders, null, 2)}`,
      );
    }
  },
});

module.exports = {
  httpClient,
};
