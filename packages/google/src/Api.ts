import { MCDocument, CacheKeys, URLS, TimeInSeconds, MCProject } from './Common';

export const baseURL = 'https://stage.mermaidchart.com';

/**
 * Attempts to access a non-Google API using a constructed service
 * object.
 *
 * If your add-on needs access to non-Google APIs that require OAuth,
 * you need to implement this method. You can use the OAuth1 and
 * OAuth2 Apps Script libraries to help implement it.
 *
 * @param url         The URL to access.
 * @param method_opt  The HTTP method. Defaults to GET.
 * @param headers_opt The HTTP headers. Defaults to an empty
 *                             object. The Authorization field is added
 *                             to the headers in this method.
 * @return {HttpResponse} the result from the UrlFetchApp.fetch() call.
 */
export function accessProtectedResource(
  url: string,
  method: GoogleAppsScript.URL_Fetch.HttpMethod = 'get',
  headers: GoogleAppsScript.URL_Fetch.HttpHeaders = {}
) {
  if (!url.startsWith('http')) {
    url = baseURL + url;
  }
  const service = getOAuthService();
  let maybeAuthorized = service.hasAccess();
  if (maybeAuthorized) {
    // A token is present, but it may be expired or invalid. Make a
    // request and check the response code to be sure.

    // Make the UrlFetch request and return the result.
    const accessToken = service.getAccessToken();
    headers['Authorization'] = Utilities.formatString('Bearer %s', accessToken);
    const resp = UrlFetchApp.fetch(url, {
      headers: headers,
      method: method,
      muteHttpExceptions: true // Prevents thrown HTTP exceptions.
    });

    const code = resp.getResponseCode();
    if (code >= 200 && code < 300) {
      return resp;
    } else if (code == 401 || code == 403) {
      // Not fully authorized for this action.
      maybeAuthorized = false;
    } else {
      // Handle other response codes by logging them and throwing an exception.
      console.error('Backend server error (%s): %s', code.toString(), resp.getContentText('utf-8'));
      throw 'Backend server error: ' + code;
    }
  }

  if (!maybeAuthorized) {
    // Invoke the authorization flow using the default authorization prompt card.
    CardService.newAuthorizationException()
      .setAuthorizationUrl(service.getAuthorizationUrl())
      .setResourceDisplayName('diagrams')
      .throwException();
  }
}

/**
 * Create a new OAuth service to facilitate accessing an API.
 * This example assumes there is a single service that the add-on needs to
 * access. Its name is used when persisting the authorized token, so ensure
 * it is unique within the scope of the property store. You must set the
 * client secret and client ID, which are obtained when registering your
 * add-on with the API.
 *
 * See the Apps Script OAuth2 Library documentation for more
 * information:
 *   https://github.com/googlesamples/apps-script-oauth2#1-create-the-oauth2-service
 *
 *  @return A configured OAuth2 service object.
 */
function getOAuthService() {
  pkceChallengeVerifier();
  const userProps = PropertiesService.getUserProperties();
  return OAuth2.createService('Mermaid Chart')
    .setAuthorizationBaseUrl(baseURL + '/oauth/authorize')
    .setTokenUrl(baseURL + '/oauth/token')
    .setClientId('f88f1365-dea8-466e-8880-e22211e145bd')
    .setScope('email')
    .setCallbackFunction('authCallback')
    .setCache(CacheService.getUserCache())
    .setPropertyStore(PropertiesService.getUserProperties())
    .setTokenPayloadHandler((payload) => {
      // @ts-ignore
      payload['code_verifier'] = userProps.getProperty('code_verifier');
      return payload;
    })
    .setParam('response_type', 'code')
    .setParam('code_challenge_method', 'S256')
    .setParam('code_challenge', userProps.getProperty('code_challenge') ?? '');
}

/**
 * Boilerplate code to determine if a request is authorized and returns
 * a corresponding HTML message. When the user completes the OAuth2 flow
 * on the service provider's website, this function is invoked from the
 * service. In order for authorization to succeed you must make sure that
 * the service knows how to call this function by setting the correct
 * redirect URL.
 *
 * The redirect URL to enter is:
 * https://script.google.com/macros/d/<Apps Script ID>/usercallback
 *
 * See the Apps Script OAuth2 Library documentation for more
 * information:
 *   https://github.com/googlesamples/apps-script-oauth2#1-create-the-oauth2-service
 *
 *  @param {Object} callbackRequest The request data received from the
 *                  callback function. Pass it to the service's
 *                  handleCallback() method to complete the
 *                  authorization process.
 *  @return {HtmlOutput} a success or denied HTML message to display to
 *          the user. Also sets a timer to close the window
 *          automatically.
 */
export function authCallback(callbackRequest: any) {
  const authorized = getOAuthService().handleCallback(callbackRequest);
  if (authorized) {
    return HtmlService.createHtmlOutput(
      'Success! You can close this tab now. <script>setTimeout(function() { top.window.close() }, 1);</script>'
    );
  } else {
    return HtmlService.createHtmlOutput('Denied');
  }
}

/**
 * Unauthorizes the non-Google service. This is useful for OAuth
 * development/testing.  Run this method (Run > resetOAuth in the script
 * editor) to reset OAuth to re-prompt the user for OAuth.
 */
export function resetOAuth() {
  getOAuthService().reset();
  PropertiesService.getUserProperties()
    .deleteProperty('code_challenge')
    .deleteProperty('code_verifier');
}

export function cachedFetch<T>(key: string, url: string, ttl: number, fallback: string = '[]'): T {
  const cache = CacheService.getUserCache();
  const shouldUseCache = hasAccess() && true; // Set to false when testing to bypass cache.
  let value = shouldUseCache ? cache.get(key) : undefined;
  if (!value) {
    value = accessProtectedResource(url)?.getContentText() ?? fallback;
    cache.put(key, value, ttl);
  }
  return JSON.parse(value) as T;
}

export function getDocuments(projectID: string): MCDocument[] {
  return cachedFetch(
    CacheKeys.documents(projectID),
    URLS.rest.projects.get(projectID).documents,
    TimeInSeconds.minutes(5)
  );
}

export function getProjects(): MCProject[] {
  return cachedFetch(CacheKeys.projects, URLS.rest.projects.list, TimeInSeconds.day);
}

function hasAccess() {
  const service = getOAuthService();
  const maybeAuthorized = service.hasAccess();
  return maybeAuthorized;
}

function pkceChallengeVerifier() {
  const userProps = PropertiesService.getUserProperties();
  if (!userProps.getProperty('code_verifier')) {
    let verifier = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < 128; i++) {
      verifier += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    const sha256Hash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      verifier,
      Utilities.Charset.US_ASCII
    );
    let challenge = Utilities.base64EncodeWebSafe(sha256Hash);
    challenge = challenge.slice(0, challenge.indexOf('='));
    userProps.setProperty('code_verifier', verifier);
    userProps.setProperty('code_challenge', challenge);
  }
}
